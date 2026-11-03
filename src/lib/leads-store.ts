import { deterministicHash, encrypt } from './security/crypto';
import type { Lead } from './leads';

/**
 * Guardado de leads del formulario público en la tabla `Lead` (ADR 0006).
 *
 * - Datos personales cifrados en reposo; `emailHash` para el derecho de
 *   supresión sin descifrar.
 * - Sin `DATABASE_URL` (producción hoy) no se intenta escribir: el llamador
 *   decide qué hacer (la API conserva el lead en el log como hasta ahora).
 * - Lo que se escribe en el log nunca lleva datos personales: `resumenLead`.
 */

export interface LeadRow {
  rol: string;
  zona: string;
  servicio: string;
  origen: string;
  nombre: string;
  email: string;
  emailHash: string;
  telefono: string | null;
  mensaje: string | null;
  consentimientoAt: Date;
}

export interface LeadDb {
  lead: { create(args: { data: LeadRow; select: { id: true } }): Promise<{ id: string }> };
}

export type ResultadoGuardado =
  | { guardado: true; id: string }
  | { guardado: false; motivo: 'sin-bd' | 'sin-clave' | 'error-bd' };

export function hayBaseDeDatos(env: Record<string, string | undefined> = process.env): boolean {
  return (env.DATABASE_URL ?? '').trim() !== '';
}

/**
 * En producción no se escribe en BD sin `OBRAS_FIELD_KEY`: el cifrado caería en
 * una clave derivada provisional y, al configurar la buena, esos leads ya no se
 * podrían descifrar (ADR 0007). Mientras falte, el lead se conserva en el log.
 */
export function hayClaveDeCifrado(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV !== 'production' || (env.OBRAS_FIELD_KEY ?? '').trim() !== '';
}

export function filaLead(lead: Lead, ahora: Date = new Date()): LeadRow {
  const email = lead.email.trim().toLowerCase();
  return {
    rol: lead.rol,
    zona: lead.zona,
    servicio: lead.service,
    origen: lead.origen,
    nombre: encrypt(lead.name) ?? '',
    email: encrypt(email) ?? '',
    emailHash: deterministicHash(email),
    telefono: encrypt(lead.phone || null),
    mensaje: encrypt(lead.message || null),
    consentimientoAt: ahora,
  };
}

/** Lo único que se registra en el log por cada lead: sin nombre, email, teléfono ni mensaje. */
export function resumenLead(lead: Lead) {
  return { rol: lead.rol, zona: lead.zona, service: lead.service, origen: lead.origen };
}

export async function guardarLead(
  lead: Lead,
  opts: { db?: LeadDb; env?: Record<string, string | undefined>; ahora?: Date } = {},
): Promise<ResultadoGuardado> {
  if (!hayBaseDeDatos(opts.env)) return { guardado: false, motivo: 'sin-bd' };
  if (!hayClaveDeCifrado(opts.env)) return { guardado: false, motivo: 'sin-clave' };
  try {
    const db: LeadDb = opts.db ?? (await import('./db')).prisma;
    const { id } = await db.lead.create({ data: filaLead(lead, opts.ahora), select: { id: true } });
    return { guardado: true, id };
  } catch {
    return { guardado: false, motivo: 'error-bd' };
  }
}
