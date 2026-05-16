import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { PHASES } from './phases';
import type { CreateProjectInput } from './validation';
import { resolveOrgId } from './organizations';
import { assertCanCreateProject } from './quotas';
import { encryptClientFields, decryptClientFields } from '@/lib/security/pii';
import { recordProjectAction } from './audit';

const REF_MAX_RETRIES = 5;

async function nextReferenceCandidate(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.project.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `OBRA-${year}-${String(count + 1).padStart(4, '0')}`;
}

/**
 * Crea un proyecto con: resolución del orgId (default si no se aporta), upsert
 * del cliente por email + encriptación de PII, generación de referencia con
 * retry en caso de colisión.
 */
export async function createProject(input: CreateProjectInput, opts: { orgId?: string | null; actor?: string } = {}) {
  const orgId = await resolveOrgId(opts.orgId ?? input.project.ayuntamientoSlug ? undefined : undefined);
  await assertCanCreateProject(orgId);

  // Upsert cliente por (orgId, email). Email no es único en BD, así que
  // buscamos manualmente dentro de la org.
  const existingClient = await prisma.client.findFirst({
    where: { email: input.client.email, orgId, deletedAt: null },
  });

  const piiPayload = encryptClientFields({
    phone: input.client.phone,
    dni: input.client.dni,
    address: input.client.address,
  });

  const client = existingClient
    ? await prisma.client.update({
        where: { id: existingClient.id },
        data: {
          fullName: input.client.fullName,
          ...piiPayload,
        },
      })
    : await prisma.client.create({
        data: {
          orgId,
          fullName: input.client.fullName,
          email: input.client.email,
          ...piiPayload,
        },
      });

  // Generar referencia con reintentos para tolerar carreras.
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < REF_MAX_RETRIES; attempt++) {
    try {
      const reference = await nextReferenceCandidate();
      const project = await prisma.project.create({
        data: {
          orgId,
          reference,
          title: input.project.title,
          summary: input.project.summary,
          addressLine: input.project.addressLine,
          city: input.project.city,
          province: input.project.province,
          postalCode: input.project.postalCode,
          cadastralId: input.project.cadastralId,
          obraType: input.project.obraType,
          useType: input.project.useType,
          surfaceM2: validateSurface(input.project.surfaceM2),
          ayuntamientoSlug: input.project.ayuntamientoSlug ?? 'generico',
          clientId: client.id,
          status: 'DRAFT',
          currentPhase: 'INTAKE',
        },
      });

      await prisma.phase.createMany({
        data: PHASES.map((p) => ({
          projectId: project.id,
          type: p.type as string,
          order: p.order,
          status: 'PENDING',
        })),
      });

      await prisma.projectEvent.create({
        data: {
          projectId: project.id,
          type: 'PROJECT_CREATED',
          actor: opts.actor ?? 'system',
          payload: JSON.stringify({ reference }),
        },
      });

      await recordProjectAction(project.id, 'CREATE', opts.actor ?? 'system');

      return project;
    } catch (err) {
      lastErr = err;
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Colisión en `reference` (`@unique`): reintentar.
        continue;
      }
      throw err;
    }
  }
  throw lastErr instanceof Error
    ? new Error(`No se pudo generar referencia única tras ${REF_MAX_RETRIES} intentos: ${lastErr.message}`)
    : new Error(`No se pudo generar referencia única tras ${REF_MAX_RETRIES} intentos`);
}

function validateSurface(v: number | undefined): number | undefined {
  if (v === undefined) return undefined;
  if (!Number.isFinite(v) || v <= 0) {
    throw new Error('surfaceM2 debe ser un número positivo');
  }
  return v;
}

export async function listProjects(opts: { take?: number; orgId?: string; includeDeleted?: boolean } = {}) {
  return prisma.project.findMany({
    where: {
      ...(opts.orgId ? { orgId: opts.orgId } : {}),
      ...(opts.includeDeleted ? {} : { deletedAt: null }),
    },
    take: opts.take ?? 50,
    orderBy: { updatedAt: 'desc' },
    include: { client: true, phases: { orderBy: { order: 'asc' } } },
  });
}

export async function getProjectDetail(id: string, opts: { includeDeleted?: boolean } = {}) {
  const project = await prisma.project.findFirst({
    where: { id, ...(opts.includeDeleted ? {} : { deletedAt: null }) },
    include: {
      client: true,
      phases: { orderBy: { order: 'asc' } },
      documents: { where: { deletedAt: null }, orderBy: [{ type: 'asc' }, { version: 'desc' }] },
      budgetItems: { where: { deletedAt: null }, orderBy: [{ chapter: 'asc' }, { code: 'asc' }] },
      drawings: { where: { deletedAt: null }, orderBy: { code: 'asc' } },
      conversations: { orderBy: { createdAt: 'asc' }, take: 200 },
      taskRuns: { orderBy: { createdAt: 'desc' }, take: 50 },
      submissions: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      events: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  });
  if (!project) return null;
  return {
    ...project,
    client: decryptClientFields(project.client),
  };
}

export async function softDeleteProject(id: string, actor = 'system') {
  await prisma.project.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await recordProjectAction(id, 'SOFT_DELETE', actor);
  await prisma.projectEvent.create({
    data: { projectId: id, type: 'SOFT_DELETED', actor, payload: '{}' },
  });
}

export async function restoreProject(id: string, actor = 'system') {
  await prisma.project.update({
    where: { id },
    data: { deletedAt: null },
  });
  await recordProjectAction(id, 'RESTORE', actor);
  await prisma.projectEvent.create({
    data: { projectId: id, type: 'RESTORED', actor, payload: '{}' },
  });
}
