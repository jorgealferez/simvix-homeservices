import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';

interface Params {
  params: Promise<{ id: string; itemId: string }>;
}

async function assertOrgScope(projectId: string, orgId: string | null, isAdmin: boolean) {
  if (isAdmin) return;
  const p = await prisma.project.findUnique({ where: { id: projectId }, select: { orgId: true } });
  if (!p) return;
  if (orgId && p.orgId !== orgId) {
    throw new Response(JSON.stringify({ error: 'No accesible' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  }
}

const patchSchema = z.object({
  chapter: z.string().optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
  quantity: z.number().positive().optional(),
  unitPrice: z.number().nonnegative().optional(),
  source: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('budget:write');
    const { id, itemId } = await params;
    await assertOrgScope(id, ctx.activeOrgId, ctx.isPlatformAdmin);
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const existing = await prisma.budgetItem.findFirst({
      where: { id: itemId, projectId: id, deletedAt: null },
    });
    if (!existing) return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 });

    const quantity = parsed.data.quantity ?? existing.quantity;
    const unitPrice = parsed.data.unitPrice ?? existing.unitPrice;
    const item = await prisma.budgetItem.update({
      where: { id: itemId },
      data: {
        ...parsed.data,
        total: quantity * unitPrice,
      },
    });
    return NextResponse.json({ item });
  } catch (err) {
    if (err instanceof Response) return err;
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('budget:write');
    const { id, itemId } = await params;
    await assertOrgScope(id, ctx.activeOrgId, ctx.isPlatformAdmin);
    await prisma.budgetItem.update({ where: { id: itemId }, data: { deletedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
