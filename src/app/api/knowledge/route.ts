import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { ingestDocument, retrieveChunks } from '@/lib/obras/rag';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requirePermission('project:read');
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    if (q) {
      const kind = searchParams.get('kind') as
        | 'PGOU' | 'CTE_DB' | 'ORDENANZA' | 'RD' | 'AUTONOMICO' | null;
      const results = await retrieveChunks(q, {
        kind: kind ?? undefined,
        region: searchParams.get('region') ?? undefined,
        limit: Number(searchParams.get('limit') ?? 5),
      });
      return NextResponse.json({ results });
    }
    const docs = await prisma.knowledgeDoc.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { chunks: true } } },
    });
    return NextResponse.json({ docs });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

const ingestSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(2),
  kind: z.enum(['PGOU', 'CTE_DB', 'ORDENANZA', 'RD', 'AUTONOMICO']),
  region: z.string().optional(),
  source: z.string().optional(),
  version: z.string().optional(),
  body: z.string().min(50),
});

export async function POST(req: Request) {
  try {
    await requirePermission('org:write');
    const body = await req.json().catch(() => null);
    const parsed = ingestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const r = await ingestDocument(parsed.data);
    return NextResponse.json(r, { status: 201 });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
