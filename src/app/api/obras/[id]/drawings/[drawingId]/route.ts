import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { storage } from '@/lib/storage';

interface Params {
  params: Promise<{ id: string; drawingId: string }>;
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

export async function GET(req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('drawing:read');
    const { id, drawingId } = await params;
    await assertOrgScope(id, ctx.activeOrgId, ctx.isPlatformAdmin);
    const drawing = await prisma.drawing.findFirst({
      where: { id: drawingId, projectId: id, deletedAt: null },
    });
    if (!drawing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    if (searchParams.get('download') === '1' && drawing.filePath) {
      const buf = await storage.get(drawing.filePath);
      return new Response(new Blob([buf as BlobPart], { type: drawing.mimeType ?? 'application/octet-stream' }), {
        status: 200,
        headers: {
          'content-type': drawing.mimeType ?? 'application/octet-stream',
          'content-disposition': `attachment; filename="${drawing.originalName ?? drawing.code}"`,
        },
      });
    }
    return NextResponse.json({ drawing });
  } catch (err) {
    if (err instanceof Response) return err;
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('drawing:write');
    const { id, drawingId } = await params;
    await assertOrgScope(id, ctx.activeOrgId, ctx.isPlatformAdmin);
    const drawing = await prisma.drawing.findFirst({
      where: { id: drawingId, projectId: id, deletedAt: null },
    });
    if (!drawing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    await prisma.drawing.update({
      where: { id: drawingId },
      data: { deletedAt: new Date() },
    });
    // Borrado físico diferido a housekeeping (idempotente).
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
