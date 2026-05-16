import { prisma } from '@/lib/db';
import { callAi, type AiCallResult, type CacheBlock, type Effort } from '@/lib/ai/client';
import type { Project } from '@prisma/client';
import type { PhaseType, DocumentType } from '@/lib/obras/enums';
import { assertAiTokenBudget, recordAiTokens } from '@/lib/obras/quotas';
import { redactPII } from '@/lib/security/redact';

export interface AgentContext {
  project: Project;
  prior: Record<string, string>;
  userInput?: string;
}

export interface AgentResult {
  ok: boolean;
  outputText: string;
  outputJson?: unknown;
  documentType?: DocumentType;
  documentTitle?: string;
  usage: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    costUsd: number;
    mocked: boolean;
    stopReason: string | null;
  };
  nextPhase?: PhaseType;
  needsHumanReview?: boolean;
  notes?: string;
  refusal?: { category?: string | null; explanation?: string | null };
}

export interface Agent {
  name: string;
  phase: PhaseType;
  label: string;
  systemPrompt: (ctx: AgentContext) => string;
  buildMessages: (ctx: AgentContext) => Array<{ role: 'user' | 'assistant'; content: string }>;
  postProcess?: (ctx: AgentContext, raw: AiCallResult) => Promise<AgentResult> | AgentResult;
  /** Modelo preferido (override de OBRAS_DEFAULT_MODEL). */
  preferredModel?: string;
  /** Effort de razonamiento. Por defecto 'high'. Usar 'xhigh' para tareas largas. */
  preferredEffort?: Effort;
  /** Tipo de documento que materializa. */
  emitsDocument?: DocumentType;
  /** Documentos previos que conviene cachear como contexto invariante. */
  cachedPriorTypes?: DocumentType[];
  /**
   * Si está presente, el orquestador hace RAG sobre la KnowledgeBase con la
   * query devuelta y los chunks recuperados se inyectan como bloque cacheable
   * antes del primer turno user (P12).
   */
  ragQuery?: (ctx: AgentContext) => { query: string; kind?: 'CTE_DB' | 'PGOU' | 'ORDENANZA' | 'RD' | 'AUTONOMICO'; region?: string; limit?: number } | null;
}

const REDACT_BEFORE_AI = (process.env.OBRAS_REDACT_PII_BEFORE_AI ?? 'true') !== 'false';

function applyRedaction(s: string | undefined): string | undefined {
  if (!s || !REDACT_BEFORE_AI) return s;
  return redactPII(s).text;
}

/**
 * Ejecuta un agente, persiste TaskRun y, si emite documento, crea/actualiza Document.
 */
export async function runAgent(agent: Agent, ctx: AgentContext): Promise<AgentResult> {
  const t0 = Date.now();
  const task = await prisma.taskRun.create({
    data: {
      projectId: ctx.project.id,
      agent: agent.name,
      phase: agent.phase,
      status: 'RUNNING',
      input: JSON.stringify({
        userInput: ctx.userInput?.slice(0, 1000),
        priorKeys: Object.keys(ctx.prior),
      }),
    },
  });

  try {
    if (ctx.project.orgId) {
      await assertAiTokenBudget(ctx.project.orgId, 2000);
    }

    // Pre-redactar PII en userInput y prior docs antes de mandar al modelo.
    const safeCtx: AgentContext = {
      ...ctx,
      userInput: applyRedaction(ctx.userInput),
      prior: REDACT_BEFORE_AI
        ? Object.fromEntries(
            Object.entries(ctx.prior).map(([k, v]) => [k, redactPII(v).text]),
          )
        : ctx.prior,
    };

    const messages = agent.buildMessages(safeCtx);
    const system = agent.systemPrompt(safeCtx);

    // Cachear como bloque user los documentos previos grandes que el agente
    // marca como "estables" (no se modifican entre llamadas a esa fase).
    const cacheableBlocks: CacheBlock[] = [];

    // RAG (P12): inyectamos los chunks recuperados como bloque cacheable.
    if (agent.ragQuery) {
      const req = agent.ragQuery(safeCtx);
      if (req?.query) {
        const { retrieveChunks, formatRetrievedAsContext } = await import('@/lib/obras/rag');
        const chunks = await retrieveChunks(req.query, {
          kind: req.kind,
          region: req.region,
          limit: req.limit ?? 5,
        });
        if (chunks.length) {
          cacheableBlocks.push({
            role: 'user',
            text:
              '<contexto_normativo>\n' +
              'Fragmentos relevantes recuperados de la KnowledgeBase (cita por número):\n\n' +
              formatRetrievedAsContext(chunks) +
              '\n</contexto_normativo>',
          });
        }
      }
    }

    if (agent.cachedPriorTypes?.length) {
      for (const t of agent.cachedPriorTypes) {
        const text = safeCtx.prior[t];
        if (text && text.length > 800) {
          cacheableBlocks.push({
            role: 'user',
            text: `<documento type="${t}">\n${text}\n</documento>`,
          });
        }
      }
    }

    const raw = await callAi({
      system,
      messages,
      model: agent.preferredModel,
      maxTokens: 4096,
      effort: agent.preferredEffort ?? 'high',
      cacheableBlocks: cacheableBlocks.slice(0, 3), // límite seguro: 3 + system = 4 breakpoints
    });

    const result: AgentResult = agent.postProcess
      ? await agent.postProcess(safeCtx, raw)
      : {
          ok: raw.stopReason !== 'refusal',
          outputText: raw.text,
          documentType: agent.emitsDocument,
          documentTitle: agent.label,
          usage: extractUsage(raw),
          refusal: raw.refusal,
        };

    await prisma.taskRun.update({
      where: { id: task.id },
      data: {
        status: result.ok ? 'SUCCEEDED' : 'FAILED',
        output: result.outputText,
        model: result.usage.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        costUsd: result.usage.costUsd,
        durationMs: Date.now() - t0,
      },
    });

    await prisma.project.update({
      where: { id: ctx.project.id },
      data: {
        aiCostUsd: { increment: result.usage.costUsd },
        aiInputTokens: { increment: result.usage.inputTokens + result.usage.cacheCreationTokens + result.usage.cacheReadTokens },
        aiOutputTokens: { increment: result.usage.outputTokens },
      },
    });

    if (ctx.project.orgId) {
      await recordAiTokens(
        ctx.project.orgId,
        result.usage.inputTokens + result.usage.outputTokens,
        result.usage.costUsd,
      );
    }

    if (result.documentType && result.documentTitle && result.ok) {
      await upsertDocument(ctx.project.id, result.documentType, result.documentTitle, result.outputText);
    }

    return result;
  } catch (err) {
    await prisma.taskRun.update({
      where: { id: task.id },
      data: {
        status: 'FAILED',
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - t0,
      },
    });
    throw err;
  }
}

function extractUsage(raw: AiCallResult): AgentResult['usage'] {
  return {
    model: raw.model,
    inputTokens: raw.inputTokens,
    outputTokens: raw.outputTokens,
    cacheReadTokens: raw.cacheReadTokens,
    cacheCreationTokens: raw.cacheCreationTokens,
    costUsd: raw.costUsd,
    mocked: raw.mocked,
    stopReason: raw.stopReason,
  };
}

async function upsertDocument(
  projectId: string,
  type: DocumentType,
  title: string,
  content: string,
): Promise<void> {
  const existing = await prisma.document.findFirst({
    where: { projectId, type },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    await prisma.document.update({
      where: { id: existing.id },
      data: {
        content,
        title,
        version: existing.version + 1,
        generatedByAi: true,
      },
    });
  } else {
    await prisma.document.create({
      data: {
        projectId,
        type,
        title,
        content,
        generatedByAi: true,
      },
    });
  }
}
