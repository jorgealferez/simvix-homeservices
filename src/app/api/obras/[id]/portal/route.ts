import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { issuePortalAccess, revokePortalAccess } from '@/lib/obras/portal';

interface Params {
  params: Promise<{ id: string }>;
}

const schema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
  expiresInDays: z.number().int().positive().max(365).optional(),
});

export async function GET(_req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('project:read');
    const { id } = await params;
    const p = await prisma.project.findUnique({ where: { id }, select: { orgId: true } });
    if (!p) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    if (!ctx.isPlatformAdmin && p.orgId && p.orgId !== ctx.activeOrgId) {
      return NextResponse.json({ error: 'No accesible' }, { status: 403 });
    }
    const accesses = await prisma.portalAccess.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ accesses });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

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
    const access = await issuePortalAccess({ projectId: id, ...parsed.data });
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    return NextResponse.json(
      {
        access,
        url: `${base}/portal/${access.token}`,
      },
      { status: 201 },
    );
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('project:write');
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const accessId = searchParams.get('accessId');
    if (!accessId) return NextResponse.json({ error: 'accessId requerido' }, { status: 400 });
    const access = await prisma.portalAccess.findUnique({ where: { id: accessId } });
    if (!access || access.projectId !== id) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }
    const p = await prisma.project.findUnique({ where: { id }, select: { orgId: true } });
    if (!ctx.isPlatformAdmin && p?.orgId && p.orgId !== ctx.activeOrgId) {
      return NextResponse.json({ error: 'No accesible' }, { status: 403 });
    }
    await revokePortalAccess(accessId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
