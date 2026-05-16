import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { analyzeDrawing, type AnalysisKind } from '@/lib/obras/drawings';

interface Params {
  params: Promise<{ id: string; drawingId: string }>;
}

const schema = z.object({
  kind: z.enum(['GENERAL', 'SUPERFICIES', 'DB_SUA', 'DB_SI', 'DISCREPANCIAS']),
  comparedWithDrawingId: z.string().optional(),
});

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
    const ctx = await requirePermission('drawing:write');
    const { id, drawingId } = await params;
    await assertOrgScope(id, ctx.activeOrgId, ctx.isPlatformAdmin);

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const analysis = await analyzeDrawing(drawingId, {
      kind: parsed.data.kind as AnalysisKind,
      comparedWithDrawingId: parsed.data.comparedWithDrawingId,
    });
    return NextResponse.json({ analysis }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    const r = authErrorResponse(err);
    if (r) return r;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('drawing:read');
    const { id, drawingId } = await params;
    await assertOrgScope(id, ctx.activeOrgId, ctx.isPlatformAdmin);

    const analyses = await prisma.drawingAnalysis.findMany({
      where: { drawingId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json({ analyses });
  } catch (err) {
    if (err instanceof Response) return err;
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
