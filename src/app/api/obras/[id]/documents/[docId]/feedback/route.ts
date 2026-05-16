import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';

interface Params {
  params: Promise<{ id: string; docId: string }>;
}

const schema = z.object({
  rating: z.enum(['UP', 'DOWN']),
  reason: z.string().max(500).optional(),
});

export async function POST(req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('document:review');
    const { id, docId } = await params;
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const doc = await prisma.document.findFirst({
      where: { id: docId, projectId: id },
    });
    if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });

    const fb = await prisma.documentFeedback.create({
      data: {
        documentId: docId,
        userId: ctx.userId,
        rating: parsed.data.rating,
        reason: parsed.data.reason,
      },
    });
    return NextResponse.json({ feedback: fb }, { status: 201 });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

export async function GET(_req: Request, { params }: Params) {
  try {
    await requirePermission('document:read');
    const { docId } = await params;
    const items = await prisma.documentFeedback.findMany({
      where: { documentId: docId },
      orderBy: { createdAt: 'desc' },
    });
    const summary = {
      up: items.filter((i) => i.rating === 'UP').length,
      down: items.filter((i) => i.rating === 'DOWN').length,
    };
    return NextResponse.json({ summary, items });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
