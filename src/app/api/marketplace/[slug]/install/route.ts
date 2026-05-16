import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';

interface Params {
  params: Promise<{ slug: string }>;
}

export async function POST(_req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('org:write');
    if (!ctx.activeOrgId) {
      return NextResponse.json({ error: 'Sin organización activa' }, { status: 400 });
    }
    const { slug } = await params;
    const listing = await prisma.marketplaceListing.findUnique({ where: { slug } });
    if (!listing || !listing.active) {
      return NextResponse.json({ error: 'Listing no encontrado' }, { status: 404 });
    }
    // Idempotente
    const install = await prisma.marketplaceInstall.upsert({
      where: { listingId_installerOrgId: { listingId: listing.id, installerOrgId: ctx.activeOrgId } },
      update: {},
      create: { listingId: listing.id, installerOrgId: ctx.activeOrgId },
    });
    // Aplicar bodyJson según kind. Para PROMPT_TEMPLATE creamos un
    // PromptTemplate clonado en la org del instalador.
    if (listing.kind === 'PROMPT_TEMPLATE') {
      const body = JSON.parse(listing.bodyJson) as { agentName: string; description?: string; body: string };
      const tmpl = await prisma.promptTemplate.upsert({
        where: { agentName: body.agentName },
        update: {},
        create: { agentName: body.agentName, description: body.description },
      });
      await prisma.promptTemplateVersion.create({
        data: { templateId: tmpl.id, version: 1, body: body.body, author: ctx.userId },
      });
    }
    await prisma.marketplaceListing.update({
      where: { id: listing.id },
      data: { installs: { increment: 1 } },
    });
    return NextResponse.json({ install });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
