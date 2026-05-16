import { buildSubmissionPackage } from '@/lib/pdf/package';
import { prisma } from '@/lib/db';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return new Response(JSON.stringify({ error: 'No encontrado' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }
  const bytes = await buildSubmissionPackage(id);
  // Convert Uint8Array to a Blob for Web Response compatibility (avoids TS lib mismatch)
  return new Response(new Blob([bytes as BlobPart], { type: 'application/pdf' }), {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${project.reference}-paquete.pdf"`,
    },
  });
}
