import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { sign, verify } from '@/lib/obras/signatures';

interface Params {
  params: Promise<{ id: string; docId: string }>;
}

const schema = z.object({
  signerName: z.string().min(2),
  signerEmail: z.string().email().optional(),
  signerDni: z.string().optional(),
  algorithm: z.enum(['SIMPLE_SHA256', 'EIDAS_ADVANCED', 'EIDAS_QUALIFIED']).optional(),
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
      where: { id: docId, projectId: id, deletedAt: null },
    });
    if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });

    const signature = await sign({
      resourceKind: 'document',
      resourceId: doc.id,
      content: doc.content,
      signer: {
        name: parsed.data.signerName,
        email: parsed.data.signerEmail,
        dni: parsed.data.signerDni,
        userId: ctx.userId,
      },
      algorithm: parsed.data.algorithm,
    });
    return NextResponse.json({ signature }, { status: 201 });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

export async function GET(_req: Request, { params }: Params) {
  try {
    await requirePermission('document:read');
    const { id, docId } = await params;
    const doc = await prisma.document.findFirst({
      where: { id: docId, projectId: id, deletedAt: null },
    });
    if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    const v = await verify({ resourceKind: 'document', resourceId: doc.id, content: doc.content });
    return NextResponse.json(v);
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
