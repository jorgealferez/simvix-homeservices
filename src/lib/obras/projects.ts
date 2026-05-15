import { prisma } from '@/lib/db';
import { PHASES } from './phases';
import type { CreateProjectInput } from './validation';

async function nextReference(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.project.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `OBRA-${year}-${String(count + 1).padStart(4, '0')}`;
}

export async function createProject(input: CreateProjectInput) {
  // Reutiliza cliente por email si ya existe (no es único en BD, pero
  // tratamos al primero encontrado como el principal).
  const existingClient = await prisma.client.findFirst({
    where: { email: input.client.email },
  });
  const client = existingClient
    ? await prisma.client.update({
        where: { id: existingClient.id },
        data: {
          fullName: input.client.fullName,
          phone: input.client.phone ?? existingClient.phone,
          dni: input.client.dni ?? existingClient.dni,
          address: input.client.address ?? existingClient.address,
        },
      })
    : await prisma.client.create({
        data: {
          fullName: input.client.fullName,
          email: input.client.email,
          phone: input.client.phone,
          dni: input.client.dni,
          address: input.client.address,
        },
      });

  const reference = await nextReference();
  const project = await prisma.project.create({
    data: {
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
      surfaceM2: input.project.surfaceM2,
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
      actor: 'system',
      payload: JSON.stringify({ reference }),
    },
  });

  return project;
}

export async function listProjects(opts: { take?: number } = {}) {
  return prisma.project.findMany({
    take: opts.take ?? 50,
    orderBy: { updatedAt: 'desc' },
    include: { client: true, phases: { orderBy: { order: 'asc' } } },
  });
}

export async function getProjectDetail(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      phases: { orderBy: { order: 'asc' } },
      documents: { orderBy: [{ type: 'asc' }, { version: 'desc' }] },
      budgetItems: { orderBy: [{ chapter: 'asc' }, { code: 'asc' }] },
      drawings: { orderBy: { code: 'asc' } },
      conversations: { orderBy: { createdAt: 'asc' }, take: 200 },
      taskRuns: { orderBy: { createdAt: 'desc' }, take: 50 },
      submissions: { orderBy: { createdAt: 'desc' } },
      events: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  });
}
