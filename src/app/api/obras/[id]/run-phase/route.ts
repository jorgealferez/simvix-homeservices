import { NextResponse } from 'next/server';
import { runPhase, runAllPendingPhases } from '@/lib/ai/orchestrator';
import { runPhaseSchema } from '@/lib/obras/validation';
import type { PhaseType } from '@/lib/obras/enums';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

interface Params {
  params: Promise<{ id: string }>;
}

async function assertOrgScope(projectId: string, orgId: string | null, isAdmin: boolean) {
  if (isAdmin) return;
  const p = await prisma.project.findUnique({ where: { id: projectId }, select: { orgId: true } });
  if (!p) return;
  if (orgId && p.orgId !== orgId) {
    throw new Response(JSON.stringify({ error: 'No accesible desde esta organización' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('project:run-phase');
    const { id } = await params;
    await assertOrgScope(id, ctx.activeOrgId, ctx.isPlatformAdmin);
    const body = await req.json().catch(() => ({}));
    if (!body?.phase) {
      const result = await runAllPendingPhases(id);
      return NextResponse.json({ result });
    }
    const parsed = runPhaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const result = await runPhase(id, parsed.data.phase as PhaseType, parsed.data.userInput);
    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof Response) return err;
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
