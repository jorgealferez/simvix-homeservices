import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { renderInvoicePdf } from '@/lib/obras/invoices';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('org:read');
    const { id } = await params;
    const inv = await prisma.invoice.findUnique({ where: { id } });
    if (!inv) {
      return new Response(JSON.stringify({ error: 'No encontrada' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (!ctx.isPlatformAdmin && inv.orgId !== ctx.activeOrgId) {
      return new Response(JSON.stringify({ error: 'No accesible' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      });
    }
    const bytes = await renderInvoicePdf(id);
    return new Response(new Blob([bytes as BlobPart], { type: 'application/pdf' }), {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${inv.number}.pdf"`,
      },
    });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
