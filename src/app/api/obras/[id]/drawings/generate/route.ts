import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { generateSvgDrawing } from '@/lib/obras/svg-generator';
import { DRAWING_CATEGORIES } from '@/lib/obras/enums';

interface Params {
  params: Promise<{ id: string }>;
}

const schema = z.object({
  prompt: z.string().min(10),
  code: z.string().min(1),
  title: z.string().min(1),
  category: z.enum(DRAWING_CATEGORIES as readonly [string, ...string[]]),
  scale: z.string().optional(),
});

export async function POST(req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('drawing:write');
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
    const result = await generateSvgDrawing({ projectId: id, ...parsed.data });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
