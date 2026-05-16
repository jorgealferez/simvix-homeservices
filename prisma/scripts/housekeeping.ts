/**
 * Tareas periódicas de mantenimiento. Pensado para correr como cron (Railway
 * cron, GitHub Action programada, etc.).
 *
 *   - Purga TaskRun exitosos con > N días (default 90).
 *   - Purga ProjectEvent informativos > N días.
 *   - Resetea contador mensual de tokens de Organization si el mes ha cambiado.
 *   - Compacta SQLite (VACUUM) si el provider es file:.
 *
 * Uso:
 *   tsx prisma/scripts/housekeeping.ts
 *   tsx prisma/scripts/housekeeping.ts --task-run-days=30 --event-days=180
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Opts {
  taskRunDays: number;
  eventDays: number;
  resetMonthlyTokens: boolean;
  vacuum: boolean;
}

function parseArgs(): Opts {
  const args = process.argv.slice(2);
  const get = (k: string, d: string) =>
    args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
  return {
    taskRunDays: Number(get('task-run-days', '90')),
    eventDays: Number(get('event-days', '180')),
    resetMonthlyTokens: get('reset-monthly-tokens', 'auto') !== 'no',
    vacuum: get('vacuum', 'yes') !== 'no',
  };
}

async function main() {
  const opts = parseArgs();
  const now = Date.now();
  const taskRunCutoff = new Date(now - opts.taskRunDays * 24 * 3600 * 1000);
  const eventCutoff = new Date(now - opts.eventDays * 24 * 3600 * 1000);

  console.log(`[housekeeping] inicio  ${new Date().toISOString()}`);

  const t1 = await prisma.taskRun.deleteMany({
    where: { createdAt: { lt: taskRunCutoff }, status: 'SUCCEEDED' },
  });
  console.log(`  · TaskRun SUCCEEDED < ${taskRunCutoff.toISOString()} purgados: ${t1.count}`);

  const t2 = await prisma.projectEvent.deleteMany({
    where: {
      createdAt: { lt: eventCutoff },
      // Preservamos los eventos críticos para auditoría legal
      type: { notIn: ['PROJECT_CREATED', 'SUBMITTED', 'SOFT_DELETED', 'RESTORED'] },
    },
  });
  console.log(`  · ProjectEvent informativos < ${eventCutoff.toISOString()} purgados: ${t2.count}`);

  if (opts.resetMonthlyTokens) {
    // Reseteo si el día del mes es 1 (asumiendo cron mensual) o si el flag es
    // forzado. Mantenemos simple: si llamas con --reset-monthly-tokens=yes se
    // ejecuta siempre.
    const today = new Date();
    const force = process.argv.includes('--reset-monthly-tokens=yes');
    if (force || today.getDate() === 1) {
      const r = await prisma.organization.updateMany({
        where: { deletedAt: null },
        data: { aiTokensMonthly: 0 },
      });
      console.log(`  · Reset contador mensual tokens en ${r.count} organizaciones`);
    } else {
      console.log(`  · Skip reset (hoy es ${today.getDate()}, no es día 1)`);
    }
  }

  if (opts.vacuum && (process.env.DATABASE_URL ?? '').startsWith('file:')) {
    try {
      await prisma.$executeRawUnsafe('VACUUM;');
      console.log('  · SQLite VACUUM completado');
    } catch (e) {
      console.warn('  · VACUUM falló:', e);
    }
  }

  console.log(`[housekeeping] fin ${new Date().toISOString()}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
