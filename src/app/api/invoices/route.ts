import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { createInvoice, markInvoiceIssued, markInvoicePaid } from '@/lib/obras/invoices';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ctx = await requirePermission('org:read');
    const invoices = await prisma.invoice.findMany({
      where: ctx.isPlatformAdmin ? {} : { orgId: ctx.activeOrgId ?? '__none__' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { lines: true },
    });
    return NextResponse.json({ invoices });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

const createSchema = z.object({
  clientId: z.string().min(1),
  projectId: z.string().optional(),
  vatRate: z.number().min(0).max(100).optional(),
  irpfRate: z.number().min(0).max(50).optional(),
  notes: z.string().optional(),
  dueInDays: z.number().int().positive().max(365).optional(),
  lines: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.number().positive(),
        unitPrice: z.number().nonnegative(),
      }),
    )
    .min(1),
});

export async function POST(req: Request) {
  try {
    const ctx = await requirePermission('org:billing');
    if (!ctx.activeOrgId) {
      return NextResponse.json({ error: 'Sin organización activa' }, { status: 400 });
    }
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const inv = await createInvoice({ orgId: ctx.activeOrgId, ...parsed.data });
    return NextResponse.json({ invoice: inv }, { status: 201 });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

const patchSchema = z.object({
  id: z.string(),
  action: z.enum(['issue', 'mark_paid']),
  paymentProvider: z.enum(['stripe', 'redsys']).optional(),
  paymentExternalId: z.string().optional(),
});

export async function PATCH(req: Request) {
  try {
    const ctx = await requirePermission('org:billing');
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const inv = await prisma.invoice.findUnique({ where: { id: parsed.data.id } });
    if (!inv || (inv.orgId !== ctx.activeOrgId && !ctx.isPlatformAdmin)) {
      return NextResponse.json({ error: 'No accesible' }, { status: 403 });
    }
    const result =
      parsed.data.action === 'issue'
        ? await markInvoiceIssued(inv.id)
        : await markInvoicePaid(inv.id, parsed.data.paymentExternalId, parsed.data.paymentProvider);
    return NextResponse.json({ invoice: result });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
