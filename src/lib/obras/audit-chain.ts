import { createHash } from 'node:crypto';
import { prisma } from '@/lib/db';

/**
 * P22 — Auditoría inmutable: hash chain sobre ProjectEvent.
 *
 * Cada evento incluye prevHash (hash del evento anterior del mismo proyecto)
 * y hash (hash del evento actual con su prevHash incluido). Esto convierte
 * la secuencia en una cadena: si se altera un evento intermedio, todos los
 * hashes posteriores dejan de coincidir y verifyAuditChain() lo detecta.
 *
 * No es resistente al borrado puro (alguien con acceso a la BD puede borrar
 * filas), pero sí a la edición silenciosa. Para integridad fuerte, exportar
 * periódicamente el `hash` del último evento a un servicio externo (TSA o
 * timestamp en blockchain) — slot dejado en docs/obras/PRIVACY.md.
 */

function canonical(ev: { type: string; payload: string; actor: string | null; createdAt: Date; id: string }): string {
  // Serialización canónica determinista — orden alfabético de claves.
  const obj = {
    actor: ev.actor ?? '',
    createdAt: ev.createdAt.toISOString(),
    id: ev.id,
    payload: ev.payload,
    type: ev.type,
  };
  return JSON.stringify(obj);
}

export function hashEvent(prevHash: string | null, ev: Parameters<typeof canonical>[0]): string {
  const h = createHash('sha256');
  h.update(prevHash ?? '');
  h.update('|');
  h.update(canonical(ev));
  return h.digest('hex');
}

/**
 * Rellena prevHash y hash de los eventos del proyecto que aún no los
 * tengan (idempotente). Llamar tras una ráfaga de inserciones.
 */
export async function backfillChain(projectId: string) {
  const events = await prisma.projectEvent.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  });
  let prev = '';
  let updated = 0;
  for (const ev of events) {
    if (ev.hash) {
      prev = ev.hash;
      continue;
    }
    const hash = hashEvent(prev || null, ev);
    await prisma.projectEvent.update({
      where: { id: ev.id },
      data: { prevHash: prev || null, hash },
    });
    prev = hash;
    updated++;
  }
  return { total: events.length, updated };
}

export interface ChainVerification {
  ok: boolean;
  total: number;
  firstTamperedId?: string;
  firstTamperedAt?: Date;
}

export async function verifyAuditChain(projectId: string): Promise<ChainVerification> {
  const events = await prisma.projectEvent.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  });
  let prev = '';
  for (const ev of events) {
    if (!ev.hash) {
      // Evento sin chain todavía: ignoramos pero no rompemos.
      continue;
    }
    const expected = hashEvent(prev || null, ev);
    if (expected !== ev.hash) {
      return {
        ok: false,
        total: events.length,
        firstTamperedId: ev.id,
        firstTamperedAt: ev.createdAt,
      };
    }
    prev = ev.hash;
  }
  return { ok: true, total: events.length };
}
