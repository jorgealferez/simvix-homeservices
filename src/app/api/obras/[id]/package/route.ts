import { buildSubmissionPackage } from '@/lib/pdf/package';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('document:read');
    const { id } = await params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return new Response(JSON.stringify({ error: 'No encontrado' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (!ctx.isPlatformAdmin && project.orgId && project.orgId !== ctx.activeOrgId) {
      return new Response(JSON.stringify({ error: 'No accesible desde esta organización' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      });
    }
    const bytes = await buildSubmissionPackage(id);
    return new Response(new Blob([bytes as BlobPart], { type: 'application/pdf' }), {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${project.reference}-paquete.pdf"`,
      },
    });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
