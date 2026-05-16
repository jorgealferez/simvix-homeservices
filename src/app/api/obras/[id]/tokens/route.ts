import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { countTokens } from '@/lib/ai/client';
import { getAgentByPhase } from '@/lib/ai/registry';
import { redactPII } from '@/lib/security/redact';
import type { PhaseType } from '@/lib/obras/enums';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * Estima los tokens de input para ejecutar una fase concreta del proyecto.
 * Útil para mostrar un “coste previsto” en la UI antes de pulsar “ejecutar”.
 */
export async function GET(req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('project:read');
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const phase = (searchParams.get('phase') ?? 'INTAKE') as PhaseType;

    const project = await prisma.project.findUnique({
      where: { id },
      include: { documents: true },
    });
    if (!project) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    if (!ctx.isPlatformAdmin && project.orgId && project.orgId !== ctx.activeOrgId) {
      return NextResponse.json({ error: 'No accesible' }, { status: 403 });
    }
    const agent = getAgentByPhase(phase);
    if (!agent) return NextResponse.json({ error: 'Fase desconocida' }, { status: 400 });

    const prior: Record<string, string> = {};
    for (const d of project.documents) {
      if (!prior[d.type]) prior[d.type] = redactPII(d.content).text;
    }
    const ctxObj = { project, prior, userInput: '' };

    const system = agent.systemPrompt(ctxObj);
    const messages = agent.buildMessages(ctxObj);

    const tokens = await countTokens({
      system,
      messages,
      model: agent.preferredModel,
    });
    return NextResponse.json({
      phase,
      agent: agent.name,
      preferredModel: agent.preferredModel ?? 'claude-opus-4-7',
      estimatedInputTokens: tokens,
      cachedPriorTypes: agent.cachedPriorTypes ?? [],
    });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
