import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getProjectDetail, softDeleteProject, restoreProject } from '@/lib/obras/projects';
import { auditProjectChange } from '@/lib/obras/audit';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';

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

export async function GET(req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('project:read');
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const includeDeleted = searchParams.get('includeDeleted') === '1';
    await assertOrgScope(id, ctx.activeOrgId, ctx.isPlatformAdmin);
    const project = await getProjectDetail(id, { includeDeleted });
    if (!project) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (err) {
    if (err instanceof Response) return err;
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  summary: z.string().nullable().optional(),
  addressLine: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  cadastralId: z.string().nullable().optional(),
  obraType: z.string().optional(),
  useType: z.string().optional(),
  surfaceM2: z.number().positive().nullable().optional(),
  ayuntamientoSlug: z.string().nullable().optional(),
  status: z.string().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('project:write');
    const { id } = await params;
    await assertOrgScope(id, ctx.activeOrgId, ctx.isPlatformAdmin);
    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const before = await prisma.project.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    const after = await prisma.project.update({ where: { id }, data: parsed.data });
    await auditProjectChange(
      before as unknown as Parameters<typeof auditProjectChange>[0],
      after as unknown as Parameters<typeof auditProjectChange>[1],
      ctx.userId,
    );
    return NextResponse.json({ project: after });
  } catch (err) {
    if (err instanceof Response) return err;
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('project:delete');
    const { id } = await params;
    await assertOrgScope(id, ctx.activeOrgId, ctx.isPlatformAdmin);
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    if (action === 'restore') {
      await restoreProject(id, ctx.userId);
    } else {
      await softDeleteProject(id, ctx.userId);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
