import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';

interface Params {
  params: Promise<{ token: string }>;
}

export async function POST(_req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('project:read');
    const { token } = await params;
    const inv = await prisma.invitation.findUnique({ where: { token } });
    if (!inv || inv.acceptedAt || inv.revokedAt) {
      return NextResponse.json({ error: 'Invitación inválida o ya consumida' }, { status: 404 });
    }
    if (inv.expiresAt && inv.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invitación expirada' }, { status: 410 });
    }
    if (ctx.email.toLowerCase() !== inv.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email de la sesión no coincide con el del destinatario de la invitación' },
        { status: 403 },
      );
    }
    // Alta como miembro de la org
    await prisma.organizationMember.upsert({
      where: { orgId_userId: { orgId: inv.orgId, userId: ctx.userId } },
      update: { role: inv.role },
      create: { orgId: inv.orgId, userId: ctx.userId, role: inv.role },
    });
    await prisma.invitation.update({
      where: { id: inv.id },
      data: { acceptedAt: new Date() },
    });
    return NextResponse.json({ ok: true, orgId: inv.orgId, role: inv.role });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
