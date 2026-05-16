import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { backfillChain, verifyAuditChain } from '@/lib/obras/audit-chain';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('audit:read');
    const { id } = await params;
    const p = await prisma.project.findUnique({ where: { id }, select: { orgId: true } });
    if (!p) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    if (!ctx.isPlatformAdmin && p.orgId && p.orgId !== ctx.activeOrgId) {
      return NextResponse.json({ error: 'No accesible' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    if (searchParams.get('verify') === '1') {
      const v = await verifyAuditChain(id);
      return NextResponse.json(v);
    }
    const events = await prisma.projectEvent.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(searchParams.get('limit') ?? 200), 500),
    });
    const audits = await prisma.projectAudit.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return NextResponse.json({ events, audits });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

export async function POST(_req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('audit:read');
    const { id } = await params;
    const p = await prisma.project.findUnique({ where: { id }, select: { orgId: true } });
    if (!p) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    if (!ctx.isPlatformAdmin && p.orgId && p.orgId !== ctx.activeOrgId) {
      return NextResponse.json({ error: 'No accesible' }, { status: 403 });
    }
    const r = await backfillChain(id);
    return NextResponse.json(r);
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
