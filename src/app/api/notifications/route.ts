import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const ctx = await requirePermission('project:read');
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? undefined;
    const notifications = await prisma.notification.findMany({
      where: {
        userId: ctx.userId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(searchParams.get('limit') ?? 50), 200),
    });
    const unread = await prisma.notification.count({
      where: { userId: ctx.userId, status: 'UNREAD' },
    });
    return NextResponse.json({ notifications, unread });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await requirePermission('project:read');
    const body = (await req.json().catch(() => null)) as { ids: string[]; status: 'READ' | 'DISMISSED' } | null;
    if (!body?.ids?.length || !['READ', 'DISMISSED'].includes(body.status)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }
    const r = await prisma.notification.updateMany({
      where: { id: { in: body.ids }, userId: ctx.userId },
      data: { status: body.status },
    });
    return NextResponse.json({ updated: r.count });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
