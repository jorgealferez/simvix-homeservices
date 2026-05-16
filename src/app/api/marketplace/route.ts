import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requirePermission('project:read');
    const { searchParams } = new URL(req.url);
    const kind = searchParams.get('kind') ?? undefined;
    const listings = await prisma.marketplaceListing.findMany({
      where: { active: true, ...(kind ? { kind } : {}) },
      orderBy: { installs: 'desc' },
      take: 50,
    });
    return NextResponse.json({ listings });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

const publishSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2),
  title: z.string().min(2),
  kind: z.enum(['PROMPT_TEMPLATE', 'PRICE_CATALOG', 'NORMATIVA', 'CHECKLIST']),
  description: z.string().optional(),
  pricing: z.enum(['FREE', 'ONE_TIME', 'SUBSCRIPTION']).default('FREE'),
  priceCents: z.number().int().nonnegative().default(0),
  bodyJson: z.string(),
});

export async function POST(req: Request) {
  try {
    const ctx = await requirePermission('org:write');
    if (!ctx.activeOrgId) {
      return NextResponse.json({ error: 'Sin organización activa' }, { status: 400 });
    }
    const body = await req.json().catch(() => null);
    const parsed = publishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const listing = await prisma.marketplaceListing.create({
      data: {
        publisherOrgId: ctx.activeOrgId,
        ...parsed.data,
      },
    });
    return NextResponse.json({ listing }, { status: 201 });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
