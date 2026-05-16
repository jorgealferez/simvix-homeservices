/**
 * Fixture de demo: crea una organización, un cliente y un proyecto sembrado
 * con tres fases ya completadas (mock). Útil para grabar demos sin depender
 * del API de Anthropic.
 *
 * Uso:
 *   tsx prisma/scripts/seed-demo.ts
 */

import { PrismaClient } from '@prisma/client';
import { encrypt } from '../../src/lib/security/crypto';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: 'demo' },
    update: {},
    create: { slug: 'demo', name: 'Estudio Demo' },
  });

  const client = await prisma.client.upsert({
    where: { id: 'demo-client' },
    update: {},
    create: {
      id: 'demo-client',
      orgId: org.id,
      fullName: 'Marta García (demo)',
      email: 'demo@simvix.com',
      phone: encrypt('+34 600 000 000'),
      dni: encrypt('00000000T'),
      address: encrypt('Calle Demo 1, 28001 Madrid'),
    },
  });

  const reference = 'OBRA-DEMO-0001';
  const project = await prisma.project.upsert({
    where: { reference },
    update: {},
    create: {
      orgId: org.id,
      reference,
      title: 'Reforma integral piso Salamanca (demo)',
      summary: 'Cocina abierta, dos baños, instalaciones nuevas.',
      addressLine: 'Calle Demo 1',
      city: 'Madrid',
      province: 'Madrid',
      postalCode: '28001',
      cadastralId: '0000000VK4700S0001AA',
      obraType: 'REFORMA_INTEGRAL',
      useType: 'VIVIENDA',
      surfaceM2: 110,
      ayuntamientoSlug: 'madrid',
      clientId: client.id,
      status: 'IN_PROGRESS',
      currentPhase: 'MEMORIA_TECNICA',
    },
  });

  // Fases base
  const phases = ['INTAKE', 'NORMATIVA', 'ANTEPROYECTO', 'MEMORIA_TECNICA', 'MEDICIONES', 'PRESUPUESTO', 'PLANOS', 'ESS', 'GESTION_RESIDUOS', 'DOC_ADMINISTRATIVA', 'PRESENTACION'];
  for (let i = 0; i < phases.length; i++) {
    await prisma.phase.upsert({
      where: { projectId_type: { projectId: project.id, type: phases[i] } },
      update: {},
      create: {
        projectId: project.id,
        type: phases[i],
        order: i + 1,
        status: i < 3 ? 'COMPLETED' : 'PENDING',
        startedAt: i < 3 ? new Date(2026, 0, 1 + i) : null,
        completedAt: i < 3 ? new Date(2026, 0, 1 + i + 1) : null,
      },
    });
  }

  await prisma.document.upsert({
    where: { id: 'demo-doc-intake' },
    update: {},
    create: {
      id: 'demo-doc-intake',
      projectId: project.id,
      type: 'INTAKE_BRIEF',
      title: 'Captura de necesidad del cliente',
      content:
        '# Brief de proyecto\n\nCliente solicita reforma integral con apertura de cocina a salón.\n\n## Pendiente\n- Confirmar fechas de inicio.\n',
      generatedByAi: true,
    },
  });

  console.log(`✔ Demo lista. Proyecto ${reference} (id=${project.id})`);
  console.log('  Visita /obras tras `npm run dev` para verlo.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
