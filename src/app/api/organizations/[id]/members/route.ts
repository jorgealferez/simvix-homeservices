import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { ROLES } from '@/lib/auth/rbac';

interface Params {
  params: Promise<{ id: string }>;
}

const addSchema = z.object({
  email: z.string().email(),
  role: z.enum(ROLES as readonly [string, ...string[]]),
});

const patchSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(ROLES as readonly [string, ...string[]]),
});

async function assertOrgAdmin(orgId: string, userId: string, isAdmin: boolean) {
  if (isAdmin) return;
  const m = await prisma.organizationMember.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!m || !['OWNER', 'ADMIN'].includes(m.role)) {
    throw new Response(JSON.stringify({ error: 'Requiere rol OWNER o ADMIN' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  }
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('org:read');
    const { id } = await params;
    if (!ctx.isPlatformAdmin && id !== ctx.activeOrgId) {
      return NextResponse.json({ error: 'No accesible' }, { status: 403 });
    }
    const members = await prisma.organizationMember.findMany({
      where: { orgId: id },
      include: { user: { select: { id: true, email: true, name: true, lastLoginAt: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ members });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('org:members:manage');
    const { id } = await params;
    await assertOrgAdmin(id, ctx.userId, ctx.isPlatformAdmin);
    const body = await req.json().catch(() => null);
    const parsed = addSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) {
      return NextResponse.json(
        { error: 'No existe un usuario con ese email. Pídele que se registre primero.' },
        { status: 404 },
      );
    }
    const existing = await prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId: id, userId: user.id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'El usuario ya es miembro', member: existing },
        { status: 409 },
      );
    }
    const member = await prisma.organizationMember.create({
      data: { orgId: id, userId: user.id, role: parsed.data.role },
    });
    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('org:members:manage');
    const { id } = await params;
    await assertOrgAdmin(id, ctx.userId, ctx.isPlatformAdmin);
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    // Evitar dejar la org sin ningún OWNER
    if (parsed.data.role !== 'OWNER') {
      const owners = await prisma.organizationMember.count({
        where: { orgId: id, role: 'OWNER' },
      });
      const target = await prisma.organizationMember.findUnique({
        where: { orgId_userId: { orgId: id, userId: parsed.data.userId } },
      });
      if (owners <= 1 && target?.role === 'OWNER') {
        return NextResponse.json(
          { error: 'No se puede dejar la organización sin OWNER' },
          { status: 400 },
        );
      }
    }
    const member = await prisma.organizationMember.update({
      where: { orgId_userId: { orgId: id, userId: parsed.data.userId } },
      data: { role: parsed.data.role },
    });
    return NextResponse.json({ member });
  } catch (err) {
    if (err instanceof Response) return err;
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('org:members:manage');
    const { id } = await params;
    await assertOrgAdmin(id, ctx.userId, ctx.isPlatformAdmin);
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Falta userId' }, { status: 400 });
    }
    // Misma protección que en PATCH
    const owners = await prisma.organizationMember.count({
      where: { orgId: id, role: 'OWNER' },
    });
    const target = await prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId: id, userId } },
    });
    if (owners <= 1 && target?.role === 'OWNER') {
      return NextResponse.json(
        { error: 'No se puede dejar la organización sin OWNER' },
        { status: 400 },
      );
    }
    await prisma.organizationMember.delete({
      where: { orgId_userId: { orgId: id, userId } },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
