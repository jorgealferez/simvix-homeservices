import { prisma } from '@/lib/db';
import type { Project } from '@prisma/client';
import type { PhaseType } from '@/lib/obras/enums';
import { getAgentByPhase, listAgents } from './registry';
import { runAgent, type AgentContext, type AgentResult } from './agents/base';
import { PHASES, nextPhaseOf } from '@/lib/obras/phases';

/**
 * Construye el contexto del agente: trae los documentos previos relevantes para
 * la fase actual.
 */
export async function buildContext(projectId: string, userInput?: string): Promise<AgentContext> {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  const docs = await prisma.document.findMany({
    where: { projectId },
    orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
  });
  // Quédate con la versión más reciente por tipo
  const prior: Record<string, string> = {};
  for (const d of docs) {
    if (!prior[d.type]) prior[d.type] = d.content;
  }
  return { project, prior, userInput };
}

/**
 * Ejecuta la fase indicada del proyecto: marca PHASE.RUNNING, corre el agente,
 * persiste el documento de salida y marca PHASE.COMPLETED (o NEEDS_REVIEW).
 */
export async function runPhase(
  projectId: string,
  phase: PhaseType,
  userInput?: string,
): Promise<AgentResult> {
  const agent = getAgentByPhase(phase);
  if (!agent) throw new Error(`No hay agente para la fase ${phase}`);

  const def = PHASES.find((p) => p.type === phase);
  if (!def) throw new Error(`Fase desconocida ${phase}`);

  // Crea/actualiza Phase como RUNNING
  await prisma.phase.upsert({
    where: { projectId_type: { projectId, type: phase as string } },
    update: { status: 'RUNNING', startedAt: new Date() },
    create: { projectId, type: phase as string, order: def.order, status: 'RUNNING', startedAt: new Date() },
  });

  const ctx = await buildContext(projectId, userInput);

  await prisma.projectEvent.create({
    data: {
      projectId,
      type: 'PHASE_STARTED',
      actor: `agent:${agent.name}`,
      payload: JSON.stringify({ phase, userInput: userInput?.slice(0, 500) }),
    },
  });

  try {
    const result = await runAgent(agent, ctx);

    await prisma.phase.update({
      where: { projectId_type: { projectId, type: phase as string } },
      data: {
        status: result.needsHumanReview ? 'NEEDS_REVIEW' : 'COMPLETED',
        completedAt: new Date(),
        resultJson:
          result.outputJson !== undefined ? JSON.stringify(result.outputJson) : null,
        notes: result.notes ?? null,
      },
    });

    // Avanza currentPhase del proyecto al siguiente paso si esta fase está completada
    const next = nextPhaseOf(phase);
    if (!result.needsHumanReview && next) {
      await prisma.project.update({
        where: { id: projectId },
        data: { currentPhase: next, status: 'IN_PROGRESS' },
      });
    } else if (!next) {
      // Última fase: lista para presentar
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'READY_TO_SUBMIT' },
      });
    }

    await prisma.projectEvent.create({
      data: {
        projectId,
        type: 'PHASE_COMPLETED',
        actor: `agent:${agent.name}`,
        payload: JSON.stringify({
          phase,
          docType: result.documentType,
          tokens: result.usage.inputTokens + result.usage.outputTokens,
          costUsd: result.usage.costUsd,
          mocked: result.usage.mocked,
        }),
      },
    });

    return result;
  } catch (err) {
    await prisma.phase.update({
      where: { projectId_type: { projectId, type: phase as string } },
      data: { status: 'FAILED', notes: err instanceof Error ? err.message : String(err) },
    });
    await prisma.projectEvent.create({
      data: {
        projectId,
        type: 'PHASE_FAILED',
        actor: `agent:${agent.name}`,
        payload: JSON.stringify({ phase, error: err instanceof Error ? err.message : String(err) }),
      },
    });
    throw err;
  }
}

/**
 * Recorre todas las fases pendientes en orden y las ejecuta secuencialmente.
 * Se detiene si una falla o requiere revisión humana.
 */
export async function runAllPendingPhases(
  projectId: string,
): Promise<{ project: Project; results: { phase: PhaseType; result: AgentResult }[] }> {
  const results: { phase: PhaseType; result: AgentResult }[] = [];
  for (const def of PHASES) {
    const existing = await prisma.phase.findUnique({
      where: { projectId_type: { projectId, type: def.type as string } },
    });
    if (existing?.status === 'COMPLETED' || existing?.status === 'SKIPPED') continue;

    try {
      const result = await runPhase(projectId, def.type);
      results.push({ phase: def.type, result });
      if (result.needsHumanReview) break;
    } catch {
      break;
    }
  }
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  return { project, results };
}

export { listAgents };
