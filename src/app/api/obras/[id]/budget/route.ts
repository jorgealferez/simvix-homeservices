import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';

interface Params {
  params: Promise<{ id: string }>;
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

const itemSchema = z.object({
  chapter: z.string().min(1),
  code: z.string().min(1),
  description: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  source: z.string().optional(),
});

export async function GET(_req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('budget:read');
    const { id } = await params;
    await assertOrgScope(id, ctx.activeOrgId, ctx.isPlatformAdmin);
    const items = await prisma.budgetItem.findMany({
      where: { projectId: id, deletedAt: null },
      orderBy: [{ chapter: 'asc' }, { code: 'asc' }],
    });
    // Resumen económico estándar PEM → PEC → IVA
    const pem = items.reduce((acc, it) => acc + it.total, 0);
    const gg = pem * 0.13;
    const bi = pem * 0.06;
    const pec = pem + gg + bi;
    const iva = pec * 0.21;
    return NextResponse.json({
      items,
      totals: { pem, gg, bi, pec, iva, total: pec + iva },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('budget:write');
    const { id } = await params;
    await assertOrgScope(id, ctx.activeOrgId, ctx.isPlatformAdmin);
    const body = await req.json().catch(() => null);
    const parsed = itemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const item = await prisma.budgetItem.create({
      data: {
        projectId: id,
        ...parsed.data,
        total: parsed.data.quantity * parsed.data.unitPrice,
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
