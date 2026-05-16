import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { ROLES } from '@/lib/auth/rbac';
import { notify } from '@/lib/obras/notifications';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ctx = await requirePermission('org:members:manage');
    if (!ctx.activeOrgId) return NextResponse.json({ invitations: [] });
    const invitations = await prisma.invitation.findMany({
      where: { orgId: ctx.activeOrgId, acceptedAt: null, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ invitations });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

const schema = z.object({
  email: z.string().email(),
  role: z.enum(ROLES as readonly [string, ...string[]]),
  scopeProjectId: z.string().optional(),
  expiresInDays: z.number().int().positive().max(60).optional(),
});

export async function POST(req: Request) {
  try {
    const ctx = await requirePermission('org:members:manage');
    if (!ctx.activeOrgId) {
      return NextResponse.json({ error: 'Sin organización activa' }, { status: 400 });
    }
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const token = 'inv_' + randomBytes(24).toString('base64url');
    const inv = await prisma.invitation.create({
      data: {
        orgId: ctx.activeOrgId,
        email: parsed.data.email,
        role: parsed.data.role,
        scopeProjectId: parsed.data.scopeProjectId,
        token,
        invitedBy: ctx.userId,
        expiresAt: new Date(Date.now() + (parsed.data.expiresInDays ?? 14) * 86400 * 1000),
      },
    });
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const url = `${base}/obras/invitations/${token}`;
    // Notificación al invitado: in-app + email si Resend está configurado
    await notify({
      email: inv.email,
      orgId: inv.orgId,
      type: 'INVITATION',
      title: `Invitación a colaborar en Simvix Obras`,
      body: `Has sido invitado como ${inv.role}. Acepta aquí: ${url}`,
      payload: { invitationId: inv.id },
    });
    return NextResponse.json({ invitation: inv, url }, { status: 201 });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
