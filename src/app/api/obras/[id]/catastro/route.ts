import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { autofillProjectFromCadastral, lookupCadastral } from '@/lib/obras/catastro';

interface Params {
  params: Promise<{ id: string }>;
}

const schema = z.object({
  ref: z.string().min(14),
});

export async function POST(req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('project:write');
    const { id } = await params;
    const p = await prisma.project.findUnique({ where: { id }, select: { orgId: true } });
    if (!p) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    if (!ctx.isPlatformAdmin && p.orgId && p.orgId !== ctx.activeOrgId) {
      return NextResponse.json({ error: 'No accesible' }, { status: 403 });
    }
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const record = await lookupCadastral(parsed.data.ref);
    const result = await autofillProjectFromCadastral(id, record);
    return NextResponse.json({ ...result, record });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
