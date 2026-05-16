/**
 * Backfill: asigna la organización "default" a todos los Client/Project que
 * tengan `orgId` nulo (datos creados antes de P01).
 *
 * Uso:
 *   tsx prisma/scripts/backfill-org.ts
 *   tsx prisma/scripts/backfill-org.ts --org=mi-estudio
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const slug =
    process.argv
      .find((a) => a.startsWith('--org='))
      ?.slice('--org='.length) ?? 'default';

  const org = await prisma.organization.upsert({
    where: { slug },
    update: {},
    create: { slug, name: slug === 'default' ? 'Simvix Obras (default)' : slug },
  });

  const c = await prisma.client.updateMany({
    where: { orgId: null },
    data: { orgId: org.id },
  });
  const p = await prisma.project.updateMany({
    where: { orgId: null },
    data: { orgId: org.id },
  });

  console.log(`✔ Backfill org=${slug} (${org.id})`);
  console.log(`  · clients actualizados: ${c.count}`);
  console.log(`  · projects actualizados: ${p.count}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
