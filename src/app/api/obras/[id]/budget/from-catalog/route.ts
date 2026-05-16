import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { addBudgetItemFromCatalog } from '@/lib/obras/catalogs';

interface Params {
  params: Promise<{ id: string }>;
}

const schema = z.object({
  catalogItemId: z.string().min(1),
  quantity: z.number().positive(),
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
    const ctx = await requirePermission('budget:write');
    const { id } = await params;
    await assertOrgScope(id, ctx.activeOrgId, ctx.isPlatformAdmin);
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const item = await addBudgetItemFromCatalog(id, parsed.data.catalogItemId, parsed.data.quantity);
    return NextResponse.json({ budgetItem: item }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    const r = authErrorResponse(err);
    if (r) return r;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
