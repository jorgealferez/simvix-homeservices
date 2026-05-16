import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { makeDrawingKey, mimeFromName, storage } from '@/lib/storage';
import { DRAWING_CATEGORIES } from '@/lib/obras/enums';
import { z } from 'zod';

interface Params {
  params: Promise<{ id: string }>;
}

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/vnd.dxf',
  'application/x-step',
]);

const MAX_SIZE_BYTES = Number(process.env.OBRAS_DRAWING_MAX_BYTES ?? 50 * 1024 * 1024);

export async function GET(_req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('drawing:read');
    const { id } = await params;
    await assertOrgScope(id, ctx.activeOrgId, ctx.isPlatformAdmin);
    const drawings = await prisma.drawing.findMany({
      where: { projectId: id, deletedAt: null },
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });
    return NextResponse.json({ drawings });
  } catch (err) {
    if (err instanceof Response) return err;
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

const metaSchema = z.object({
  code: z.string().min(1).max(32),
  title: z.string().min(1).max(200),
  scale: z.string().max(32).optional(),
  category: z.enum(DRAWING_CATEGORIES as readonly [string, ...string[]]),
});

/**
 * Upload multipart/form-data con campos:
 *   file: el binario
 *   code, title, category, scale?: metadatos
 */
export async function POST(req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('drawing:write');
    const { id } = await params;
    await assertOrgScope(id, ctx.activeOrgId, ctx.isPlatformAdmin);

    const fd = await req.formData();
    const file = fd.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Falta el archivo (campo "file")' }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Archivo demasiado grande (${file.size} > ${MAX_SIZE_BYTES})` },
        { status: 413 },
      );
    }
    const declaredMime = file.type || mimeFromName(file.name) || 'application/octet-stream';
    if (declaredMime !== 'application/octet-stream' && !ALLOWED_MIME.has(declaredMime)) {
      return NextResponse.json(
        { error: `Tipo no admitido: ${declaredMime}` },
        { status: 415 },
      );
    }

    const meta = metaSchema.safeParse({
      code: fd.get('code'),
      title: fd.get('title'),
      scale: fd.get('scale') || undefined,
      category: fd.get('category'),
    });
    if (!meta.success) {
      return NextResponse.json(
        { error: 'Metadatos inválidos', details: meta.error.flatten() },
        { status: 400 },
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const key = makeDrawingKey(id, file.name);
    const stored = await storage.put(key, buf, { mimeType: declaredMime });

    const drawing = await prisma.drawing.create({
      data: {
        projectId: id,
        code: meta.data.code,
        title: meta.data.title,
        scale: meta.data.scale,
        category: meta.data.category,
        filePath: stored.key,
        originalName: file.name,
        mimeType: declaredMime,
        sizeBytes: stored.sizeBytes,
        sha256: stored.sha256,
        uploadedBy: ctx.userId,
      },
    });

    await prisma.projectEvent.create({
      data: {
        projectId: id,
        type: 'DRAWING_UPLOADED',
        actor: ctx.userId,
        payload: JSON.stringify({ drawingId: drawing.id, sizeBytes: stored.sizeBytes, sha256: stored.sha256 }),
      },
    });

    return NextResponse.json({ drawing }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

async function assertOrgScope(projectId: string, orgId: string | null, isAdmin: boolean) {
  if (isAdmin) return;
  const p = await prisma.project.findUnique({ where: { id: projectId }, select: { orgId: true } });
  if (!p) return;
  if (orgId && p.orgId !== orgId) {
    throw new Response(JSON.stringify({ error: 'No accesible desde esta organización' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  }
}
