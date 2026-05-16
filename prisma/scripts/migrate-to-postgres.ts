/**
 * Migración asistida SQLite → Postgres.
 *
 * Estrategia:
 *   1. Lee todos los datos de la BD SQLite origen.
 *   2. Conecta a Postgres (destino) y aplica el mismo schema (debe haberse
 *      cambiado `provider = "postgresql"` y ejecutado `prisma db push`).
 *   3. Inserta los registros en orden de dependencias.
 *
 * Variables de entorno:
 *   SQLITE_URL       (default: file:./prisma/dev.db)
 *   POSTGRES_URL     (obligatoria)
 *
 * Uso:
 *   SQLITE_URL="file:./prisma/dev.db" \
 *   POSTGRES_URL="postgresql://user:pass@host:5432/simvix" \
 *   tsx prisma/scripts/migrate-to-postgres.ts
 */

import { PrismaClient } from '@prisma/client';

async function main() {
  const sqliteUrl = process.env.SQLITE_URL ?? 'file:./prisma/dev.db';
  const postgresUrl = process.env.POSTGRES_URL;
  if (!postgresUrl) {
    console.error('Falta POSTGRES_URL');
    process.exit(1);
  }

  const src = new PrismaClient({ datasources: { db: { url: sqliteUrl } } });
  const dst = new PrismaClient({ datasources: { db: { url: postgresUrl } } });

  console.log('[migrate] leyendo SQLite…');
  const [orgs, members, clients, projects, phases, conversations, documents, budgetItems, drawings, taskRuns, submissions, events, audits, templates] =
    await Promise.all([
      src.organization.findMany(),
      src.organizationMember.findMany(),
      src.client.findMany(),
      src.project.findMany(),
      src.phase.findMany(),
      src.conversation.findMany(),
      src.document.findMany(),
      src.budgetItem.findMany(),
      src.drawing.findMany(),
      src.taskRun.findMany(),
      src.submission.findMany(),
      src.projectEvent.findMany(),
      src.projectAudit.findMany(),
      src.regulationTemplate.findMany(),
    ]);

  console.log('[migrate] poblando Postgres…');
  // Orden con respeto a FKs
  if (orgs.length) await dst.organization.createMany({ data: orgs });
  if (members.length) await dst.organizationMember.createMany({ data: members });
  if (clients.length) await dst.client.createMany({ data: clients });
  if (projects.length) await dst.project.createMany({ data: projects });
  if (phases.length) await dst.phase.createMany({ data: phases });
  if (conversations.length) await dst.conversation.createMany({ data: conversations });
  if (documents.length) await dst.document.createMany({ data: documents });
  if (budgetItems.length) await dst.budgetItem.createMany({ data: budgetItems });
  if (drawings.length) await dst.drawing.createMany({ data: drawings });
  if (taskRuns.length) await dst.taskRun.createMany({ data: taskRuns });
  if (submissions.length) await dst.submission.createMany({ data: submissions });
  if (events.length) await dst.projectEvent.createMany({ data: events });
  if (audits.length) await dst.projectAudit.createMany({ data: audits });
  if (templates.length) await dst.regulationTemplate.createMany({ data: templates });

  console.log('✔ Migración terminada.');
  await Promise.all([src.$disconnect(), dst.$disconnect()]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
