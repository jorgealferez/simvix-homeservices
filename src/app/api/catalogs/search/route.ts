import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { searchItems } from '@/lib/obras/catalogs';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  q: z.string().min(1).max(200),
  catalogSlugs: z.string().optional(), // CSV
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export async function GET(req: Request) {
  try {
    const ctx = await requirePermission('budget:read');
    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      q: searchParams.get('q'),
      catalogSlugs: searchParams.get('catalogSlugs'),
      limit: searchParams.get('limit') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const catalogSlugs = parsed.data.catalogSlugs
      ? parsed.data.catalogSlugs.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
    const results = await searchItems(parsed.data.q, {
      catalogSlugs,
      orgId: ctx.activeOrgId,
      limit: parsed.data.limit,
    });
    return NextResponse.json({ results });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
