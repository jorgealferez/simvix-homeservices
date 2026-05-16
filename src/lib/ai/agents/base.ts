import { prisma } from '@/lib/db';
import { callAi, type AiCallResult } from '@/lib/ai/client';
import type { Project } from '@prisma/client';
import type { PhaseType, DocumentType } from '@/lib/obras/enums';

export interface AgentContext {
  project: Project;
  // Documentos previos relevantes (agrupados por type)
  prior: Record<string, string>;
  // Mensaje libre del usuario para esta ejecución
  userInput?: string;
}

export interface AgentResult {
  ok: boolean;
  outputText: string;
  outputJson?: unknown;
  documentType?: DocumentType; // se persistirá en Document si está presente
  documentTitle?: string;
  usage: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    mocked: boolean;
  };
  // Si el agente recomienda saltar a una fase concreta (por excepción)
  nextPhase?: PhaseType;
  // Si requiere intervención humana antes de marcar la fase completa
  needsHumanReview?: boolean;
  notes?: string;
}

export interface Agent {
  /** identificador estable, usado en BD y logs */
  name: string;
  /** fase a la que sirve */
  phase: PhaseType;
  /** título legible */
  label: string;
  /** prompt del sistema */
  systemPrompt: (ctx: AgentContext) => string;
  /** construye los mensajes del turno actual */
  buildMessages: (ctx: AgentContext) => Array<{ role: 'user' | 'assistant'; content: string }>;
  /** parsea / post-procesa la salida cruda */
  postProcess?: (ctx: AgentContext, raw: AiCallResult) => Promise<AgentResult> | AgentResult;
  /** modelo preferido (override de OBRAS_DEFAULT_MODEL) */
  preferredModel?: string;
  /** documentType que se materializará si el agente entrega un documento */
  emitsDocument?: DocumentType;
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
        userInput: ctx.userInput,
        priorKeys: Object.keys(ctx.prior),
      }),
    },
  });

  try {
    const messages = agent.buildMessages(ctx);
    const system = agent.systemPrompt(ctx);
    const raw = await callAi({
      system,
      messages,
      model: agent.preferredModel,
      maxTokens: 4096,
    });

    const result: AgentResult = agent.postProcess
      ? await agent.postProcess(ctx, raw)
      : {
          ok: true,
          outputText: raw.text,
          documentType: agent.emitsDocument,
          documentTitle: agent.label,
          usage: {
            model: raw.model,
            inputTokens: raw.inputTokens,
            outputTokens: raw.outputTokens,
            costUsd: raw.costUsd,
            mocked: raw.mocked,
          },
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

    // Acumular auditoría agregada en Project
    await prisma.project.update({
      where: { id: ctx.project.id },
      data: {
        aiCostUsd: { increment: result.usage.costUsd },
        aiInputTokens: { increment: result.usage.inputTokens },
        aiOutputTokens: { increment: result.usage.outputTokens },
      },
    });

    if (result.documentType && result.documentTitle) {
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
