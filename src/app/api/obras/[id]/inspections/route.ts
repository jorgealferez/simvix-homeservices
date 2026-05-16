import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { createInspection, analyzeInspection } from '@/lib/obras/site-inspections';

interface Params {
  params: Promise<{ id: string }>;
}

async function assertOrgScope(projectId: string, orgId: string | null, isAdmin: boolean) {
  if (isAdmin) return;
  const p = await prisma.project.findUnique({ where: { id: projectId }, select: { orgId: true } });
  if (!p) return;
  if (orgId && p.orgId !== orgId) {
    throw new Response(JSON.stringify({ error: 'No accesible' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  }
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('project:read');
    const { id } = await params;
    await assertOrgScope(id, ctx.activeOrgId, ctx.isPlatformAdmin);
    const items = await prisma.siteInspection.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ inspections: items });
  } catch (err) {
    if (err instanceof Response) return err;
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

/** Upload multipart con file + campos inspectorName, latitude?, longitude?, notes? */
export async function POST(req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('project:write');
    const { id } = await params;
    await assertOrgScope(id, ctx.activeOrgId, ctx.isPlatformAdmin);
    const fd = await req.formData();
    const file = fd.get('photo');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Falta photo' }, { status: 400 });
    }
    const inspectorName = String(fd.get('inspectorName') ?? ctx.email);
    const lat = fd.get('latitude') ? Number(fd.get('latitude')) : undefined;
    const lng = fd.get('longitude') ? Number(fd.get('longitude')) : undefined;
    const notes = (fd.get('notes') as string | null) ?? undefined;

    const inspection = await createInspection({
      projectId: id,
      inspectorId: ctx.userId,
      inspectorName,
      photo: Buffer.from(await file.arrayBuffer()),
      photoName: file.name,
      photoMime: file.type || undefined,
      latitude: lat,
      longitude: lng,
      notes,
    });

    // Lanzamos análisis IA. Si tarda demasiado, en producción esto iría a una
    // cola; aquí lo hacemos síncrono para mantener simple.
    const analyzed = await analyzeInspection(inspection.id);
    return NextResponse.json({ inspection: analyzed }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    const r = authErrorResponse(err);
    if (r) return r;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
