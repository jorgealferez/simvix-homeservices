import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { storage } from '@/lib/storage';
import { summarizeIfc } from '@/lib/obras/ifc';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: Params) {
  try {
    await requirePermission('drawing:read');
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const drawingId = searchParams.get('drawingId');
    if (!drawingId) return NextResponse.json({ error: 'drawingId requerido' }, { status: 400 });
    const d = await prisma.drawing.findFirst({
      where: { id: drawingId, projectId: id, deletedAt: null },
    });
    if (!d || !d.filePath) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    if (d.mimeType !== 'application/x-step' && !d.originalName?.toLowerCase().endsWith('.ifc')) {
      return NextResponse.json({ error: 'No es un archivo IFC' }, { status: 415 });
    }
    const buf = await storage.get(d.filePath);
    // Sólo summarizamos los primeros 5MB para evitar costes.
    const slice = buf.subarray(0, 5 * 1024 * 1024);
    const summary = summarizeIfc(slice.toString('utf8'));
    return NextResponse.json({ summary });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
