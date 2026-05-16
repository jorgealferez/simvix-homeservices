import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { importCatalogFromCsv } from '@/lib/obras/catalogs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ctx = await requirePermission('budget:read');
    const catalogs = await prisma.priceCatalog.findMany({
      where: {
        active: true,
        OR: [{ orgId: null }, ...(ctx.activeOrgId ? [{ orgId: ctx.activeOrgId }] : [])],
      },
      orderBy: { name: 'asc' },
      include: { _count: { select: { items: true } } },
    });
    return NextResponse.json({ catalogs });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

const importSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().min(2),
  source: z.enum(['CYPE', 'BEDEC', 'PROPIO', 'OTRO']),
  region: z.string().optional(),
  year: z.number().int().optional(),
  priceVersion: z.string().optional(),
  /** Si true, sólo lo verá la organización activa. */
  privateToOrg: z.boolean().optional(),
  csv: z.string().min(10),
});

export async function POST(req: Request) {
  try {
    const ctx = await requirePermission('budget:write');
    const body = await req.json().catch(() => null);
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const result = await importCatalogFromCsv({
      ...parsed.data,
      orgId: parsed.data.privateToOrg ? ctx.activeOrgId : null,
    });
    return NextResponse.json(
      {
        catalog: result.catalog,
        itemsCount: result.itemsCount,
      },
      { status: 201 },
    );
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
