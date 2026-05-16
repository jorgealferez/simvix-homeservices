import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ctx = await requirePermission('org:write');
    if (!ctx.activeOrgId) return NextResponse.json({ endpoints: [] });
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { orgId: ctx.activeOrgId },
      orderBy: { createdAt: 'desc' },
    });
    // No devolvemos `secret` en claro.
    return NextResponse.json({
      endpoints: endpoints.map((e) => ({ ...e, secret: '***' })),
    });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

const schema = z.object({
  name: z.string().min(2),
  url: z.string().url(),
  events: z.string().min(2), // CSV
});

export async function POST(req: Request) {
  try {
    const ctx = await requirePermission('org:write');
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
    const secret = 'whs_' + randomBytes(24).toString('base64url');
    const ep = await prisma.webhookEndpoint.create({
      data: {
        orgId: ctx.activeOrgId,
        name: parsed.data.name,
        url: parsed.data.url,
        events: parsed.data.events,
        secret,
      },
    });
    // Secret se devuelve UNA sola vez.
    return NextResponse.json({ endpoint: ep, secret }, { status: 201 });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
