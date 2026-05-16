import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.organization.upsert({
    where: { slug: 'default' },
    update: {},
    create: { slug: 'default', name: 'Simvix Obras (default)' },
  });

  await prisma.regulationTemplate.upsert({
    where: { slug: 'cte-db-he' },
    update: {},
    create: {
      slug: 'cte-db-he',
      title: 'CTE DB-HE — Ahorro de energía',
      scope: 'nacional',
      obraTypes: 'OBRA_NUEVA,REHABILITACION,REFORMA_INTEGRAL',
      body: `# DB-HE Ahorro de energía\n\nExigencias mínimas: HE0 (limitación del consumo), HE1 (envolvente térmica), HE2 (instalaciones térmicas), HE3 (iluminación), HE4 (energías renovables ACS), HE5 (energías renovables eléctricas).`,
      source: 'https://www.codigotecnico.org/',
      version: '2025',
    },
  });

  await prisma.regulationTemplate.upsert({
    where: { slug: 'rd-105-2008' },
    update: {},
    create: {
      slug: 'rd-105-2008',
      title: 'RD 105/2008 — Producción y gestión de residuos de construcción y demolición',
      scope: 'nacional',
      obraTypes:
        'OBRA_NUEVA,REFORMA_INTEGRAL,REFORMA_INTERIOR,DEMOLICION,AMPLIACION,REHABILITACION',
      body: `# RD 105/2008\n\nObligación de redactar estudio de gestión de residuos, separación en obra según umbrales por fracción y entrega a gestor autorizado.`,
      source: 'https://www.boe.es/eli/es/rd/2008/02/01/105',
      version: '2008',
    },
  });

  await prisma.regulationTemplate.upsert({
    where: { slug: 'rd-1627-1997' },
    update: {},
    create: {
      slug: 'rd-1627-1997',
      title: 'RD 1627/1997 — Disposiciones mínimas de seguridad y salud en obras de construcción',
      scope: 'nacional',
      obraTypes:
        'OBRA_NUEVA,REFORMA_INTEGRAL,REFORMA_INTERIOR,DEMOLICION,AMPLIACION,REHABILITACION,CAMBIO_USO,LEGALIZACION',
      body: `# RD 1627/1997\n\nObligación de estudio de seguridad y salud (o estudio básico según art. 4) y plan de seguridad y salud del contratista.`,
      source: 'https://www.boe.es/eli/es/rd/1997/10/24/1627',
      version: '1997',
    },
  });

  console.log('✔ Org default + RegulationTemplates sembradas.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
