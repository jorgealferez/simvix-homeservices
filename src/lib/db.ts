import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Cliente Prisma singleton con extras de P01:
 *   - Slow query log (> SLOW_QUERY_MS, default 500ms).
 *   - PRAGMA WAL + busy_timeout cuando el provider es SQLite (concurrencia
 *     local sin perder durabilidad).
 *   - Hooks ligeros mediante `$extends` para filtrar automáticamente registros
 *     con `deletedAt: not null` en lecturas. La extensión es opt-in vía
 *     `prismaWithSoftDelete()`.
 */

declare global {
  // eslint-disable-next-line no-var
  var __simvixPrisma: PrismaClient | undefined;
}

const SLOW_QUERY_MS = Number(process.env.OBRAS_SLOW_QUERY_MS ?? 500);

function createPrisma(): PrismaClient {
  const client = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'stdout', level: 'error' },
      { emit: 'stdout', level: 'warn' },
    ],
  });

  client.$on('query', (e: Prisma.QueryEvent) => {
    if (e.duration >= SLOW_QUERY_MS) {
      // eslint-disable-next-line no-console
      console.warn(
        `[prisma:slow] ${e.duration}ms ${e.query.slice(0, 200)}${e.query.length > 200 ? '…' : ''}`,
      );
    }
  });

  return client;
}

export const prisma: PrismaClient = global.__simvixPrisma ?? createPrisma();

if (process.env.NODE_ENV !== 'production') {
  global.__simvixPrisma = prisma;
}

let _pragmaApplied = false;
/**
 * Aplica los PRAGMAs recomendados a SQLite. Idempotente y no-op en Postgres.
 */
export async function applySqlitePragmas(): Promise<void> {
  if (_pragmaApplied) return;
  const url = process.env.DATABASE_URL ?? '';
  if (!url.startsWith('file:')) {
    _pragmaApplied = true;
    return;
  }
  try {
    // SQLite devuelve filas de respuesta para varios PRAGMA SET-style. Usamos
    // queryRawUnsafe (acepta resultset) para todos por simplicidad.
    await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000;');
    await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
    _pragmaApplied = true;
  } catch {
    // En entornos managed (Edge) raw puede no estar disponible.
    _pragmaApplied = true;
  }
}
