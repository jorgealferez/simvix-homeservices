import { prisma } from '@/lib/db';

export const DEFAULT_ORG_SLUG = 'default';

/**
 * Devuelve la organización "default" (singleton). Si no existe la crea. Es la
 * estrategia de compat para uso unipersonal sin multi-tenant explícito.
 */
export async function getOrCreateDefaultOrg() {
  const existing = await prisma.organization.findUnique({ where: { slug: DEFAULT_ORG_SLUG } });
  if (existing) return existing;
  return prisma.organization.create({
    data: {
      slug: DEFAULT_ORG_SLUG,
      name: 'Simvix Obras (default)',
    },
  });
}

export async function resolveOrgId(orgIdOrSlug?: string | null): Promise<string> {
  if (orgIdOrSlug) {
    const byId = await prisma.organization.findFirst({
      where: { OR: [{ id: orgIdOrSlug }, { slug: orgIdOrSlug }], deletedAt: null },
    });
    if (byId) return byId.id;
  }
  const def = await getOrCreateDefaultOrg();
  return def.id;
}

export async function listOrganizations() {
  return prisma.organization.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
  });
}

export async function createOrganization(input: {
  slug: string;
  name: string;
  maxProjects?: number | null;
  maxAiTokensMonthly?: number | null;
  maxStorageMb?: number | null;
}) {
  return prisma.organization.create({
    data: {
      slug: input.slug,
      name: input.name,
      maxProjects: input.maxProjects ?? null,
      maxAiTokensMonthly: input.maxAiTokensMonthly ?? null,
      maxStorageMb: input.maxStorageMb ?? null,
    },
  });
}
