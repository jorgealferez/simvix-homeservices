import { createHash } from 'node:crypto';
import { decrypt, encrypt } from './security/crypto';
import { services } from './services';
import { SITE_URL } from './site';
import { zonas } from './zonas';
import type { Lead } from './leads';

/**
 * Eventos hacia Brain (simvix-brain, contrato de eventos v1: `POST /api/eventos`;
 * ADR 0011). Cada lead se guarda en el *outbox* (tabla `BrainOutbox`) en la misma
 * transacción que el lead, y el emisor lo envía después con reintentos:
 *
 *   - 202 → `enviado` (guardado en Brain; se vacía la copia cifrada del evento).
 *   - 400 → `rechazado` (Brain no lo aceptará nunca igual; no se reintenta).
 *   - cualquier otra cosa (401, 404, 429, 5xx, red caída, timeout) → se reintenta
 *     con espera creciente (30 s, 1, 2, 4 ... min, hasta 1 h) y sin límite de intentos.
 *
 * Sin `BRAIN_URL`/`BRAIN_TOKEN` no se envía nada: los eventos esperan en el outbox
 * y salen en cuanto el servicio tenga las dos variables. El token nunca se registra.
 */

export type BrainEnv = Record<string, string | undefined>;
export type BrainFetch = (url: string, init: RequestInit) => Promise<{ status: number; text(): Promise<string> }>;

export interface UtmBrain {
  source?: string;
  medium?: string;
  campaign?: string;
}

export interface DatosContacto {
  nombre: string;
  email: string;
  telefono?: string;
  canal: 'formulario';
  asunto: string;
  mensaje?: string;
  url: string;
  origen: string;
  utm?: UtmBrain;
}

export interface EventoBrain {
  tipo: 'contacto' | 'presupuesto';
  clave: string;
  ocurrido_en: string;
  datos: Record<string, unknown>;
}

export const LOTE_MAXIMO = 100;
export const TIMEOUT_MS = 10_000;
const ESPERA_BASE_MS = 30_000;
const ESPERA_MAXIMA_MS = 60 * 60_000;

export function brainEventosConfigurado(env: BrainEnv = process.env): boolean {
  return Boolean((env.BRAIN_URL ?? '').trim() && (env.BRAIN_TOKEN ?? '').trim());
}

/** Clave de idempotencia en Brain: una por lead. */
export function claveLead(id: string): string {
  return `lead-${id}`;
}

/** Brain acepta de 6 a 16 dígitos; lo demás se omite para no provocar un 400. */
export function telefonoBrain(telefono: string | null | undefined): string | undefined {
  const t = (telefono ?? '').trim();
  if (!t) return undefined;
  const digitos = t.replace(/\D/g, '');
  if (digitos.length < 6 || digitos.length > 16) return undefined;
  return (t.startsWith('+') ? '+' : '') + digitos;
}

/** `origen` del formulario es `utm_source:utm_campaign` (o solo uno de los dos). */
export function utmDeOrigen(origen: string): UtmBrain | undefined {
  const o = (origen ?? '').trim();
  if (!o) return undefined;
  const i = o.indexOf(':');
  const source = (i === -1 ? o : o.slice(0, i)).trim();
  const campaign = (i === -1 ? '' : o.slice(i + 1)).trim();
  const utm: UtmBrain = {};
  if (source) utm.source = source;
  if (campaign) utm.campaign = campaign;
  return Object.keys(utm).length ? utm : undefined;
}

function recortar(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}

export function datosContacto(lead: Lead): DatosContacto {
  const servicio = services.find((s) => s.id === lead.service)?.title ?? lead.service;
  const zona = lead.zona === 'otra' ? 'otra zona' : (zonas.find((z) => z.slug === lead.zona)?.nombre ?? lead.zona);
  const quien = lead.rol === 'profesional' ? 'Profesional que se apunta' : 'Familia que pide servicio';
  const datos: DatosContacto = {
    nombre: recortar(lead.name, 200),
    email: lead.email.trim().toLowerCase(),
    canal: 'formulario',
    asunto: recortar(`${quien}: ${servicio} · ${zona}`, 300),
    url: `${SITE_URL}/contacto`,
    origen: recortar(`Formulario de contacto de ${SITE_URL.replace(/^https?:\/\//, '')} (${lead.rol})`, 200),
  };
  const telefono = telefonoBrain(lead.phone);
  if (telefono) datos.telefono = telefono;
  if (lead.message) datos.mensaje = recortar(lead.message, 5000);
  const utm = utmDeOrigen(lead.origen);
  if (utm) datos.utm = utm;
  return datos;
}

export function eventoContacto(lead: Lead, id: string, ocurridoEn: Date): EventoBrain {
  return {
    tipo: 'contacto',
    clave: claveLead(id),
    ocurrido_en: ocurridoEn.toISOString(),
    datos: datosContacto(lead) as unknown as Record<string, unknown>,
  };
}

/** Fila del outbox: el evento entero va cifrado porque lleva datos personales. */
export function filaOutbox(evento: EventoBrain, ahora: Date = new Date()) {
  return {
    tipo: evento.tipo,
    clave: evento.clave,
    evento: encrypt(JSON.stringify(evento)) ?? '',
    siguienteIntento: ahora,
  };
}

/** Espera antes del intento `n + 1` tras `n` fallos: 30 s, 1, 2, 4 ... min, tope 1 h. */
export function esperaTrasFallos(intentos: number): number {
  const n = Math.max(1, intentos);
  return Math.min(ESPERA_BASE_MS * 2 ** (n - 1), ESPERA_MAXIMA_MS);
}

export type ResultadoEnvio =
  | { tipo: 'sin-config' }
  | { tipo: 'aceptado' }
  | { tipo: 'rechazado'; error: string }
  | { tipo: 'reintentar'; error: string };

function sinToken(texto: string, token: string): string {
  return token ? texto.split(token).join('[BRAIN_TOKEN]') : texto;
}

/** Un envío a `POST /api/eventos`. Nunca lanza. */
export async function enviarEventos(
  eventos: EventoBrain[],
  env: BrainEnv = process.env,
  doFetch: BrainFetch = fetch as unknown as BrainFetch,
): Promise<ResultadoEnvio> {
  if (!brainEventosConfigurado(env)) return { tipo: 'sin-config' };
  const url = (env.BRAIN_URL as string).trim().replace(/\/+$/, '');
  const token = (env.BRAIN_TOKEN as string).trim();
  try {
    const res = await doFetch(`${url}/api/eventos`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ eventos }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 202) return { tipo: 'aceptado' };
    let cuerpo = '';
    try {
      cuerpo = await res.text();
    } catch {
      cuerpo = '';
    }
    const error = sinToken(recortar(`HTTP ${res.status} ${cuerpo}`.trim(), 500), token);
    return res.status === 400 ? { tipo: 'rechazado', error } : { tipo: 'reintentar', error };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    return { tipo: 'reintentar', error: sinToken(recortar(raw, 500), token) };
  }
}

/* ------------------------------------------------------------------ outbox */

export interface FilaPendiente {
  id: string;
  clave: string;
  evento: string;
  intentos: number;
}

export interface OutboxDb {
  brainOutbox: {
    findMany(args: {
      where: { estado: 'pendiente'; siguienteIntento: { lte: Date } };
      orderBy: { createdAt: 'asc' };
      take: number;
      select: { id: true; clave: true; evento: true; intentos: true };
    }): Promise<FilaPendiente[]>;
    update(args: {
      where: { id: string };
      data: {
        estado?: string;
        evento?: string;
        intentos?: number;
        siguienteIntento?: Date;
        ultimoError?: string | null;
        enviadoAt?: Date;
      };
    }): Promise<unknown>;
  };
}

export interface ResumenOutbox {
  enviados: number;
  rechazados: number;
  reintentos: number;
  omitido?: 'sin-config' | 'sin-bd' | 'en-curso' | 'error-bd';
}

let enCurso = false;

/**
 * Vacía lo que toca del outbox: hasta `limite` eventos pendientes cuya hora de
 * reintento ha llegado, en un lote. Si Brain rechaza el lote (400, todo o nada),
 * se reenvían uno a uno para aislar el que no vale. Nunca lanza.
 */
export async function procesarOutbox(
  opts: { db?: OutboxDb; env?: BrainEnv; fetch?: BrainFetch; ahora?: Date; limite?: number } = {},
): Promise<ResumenOutbox> {
  const env = opts.env ?? process.env;
  const resumen: ResumenOutbox = { enviados: 0, rechazados: 0, reintentos: 0 };
  if (!brainEventosConfigurado(env)) return { ...resumen, omitido: 'sin-config' };
  if (!opts.db && !(env.DATABASE_URL ?? '').trim()) return { ...resumen, omitido: 'sin-bd' };
  if (enCurso) return { ...resumen, omitido: 'en-curso' };
  enCurso = true;
  try {
    const db: OutboxDb = opts.db ?? (await import('./db')).prisma;
    const ahora = opts.ahora ?? new Date();
    const filas = await db.brainOutbox.findMany({
      where: { estado: 'pendiente', siguienteIntento: { lte: ahora } },
      orderBy: { createdAt: 'asc' },
      take: Math.min(opts.limite ?? LOTE_MAXIMO, LOTE_MAXIMO),
      select: { id: true, clave: true, evento: true, intentos: true },
    });
    if (!filas.length) return resumen;

    const validas: { fila: FilaPendiente; evento: EventoBrain }[] = [];
    for (const fila of filas) {
      const plano = decrypt(fila.evento);
      let evento: EventoBrain | null = null;
      try {
        evento = plano ? (JSON.parse(plano) as EventoBrain) : null;
      } catch {
        evento = null;
      }
      if (evento) validas.push({ fila, evento });
      else {
        // Sin poder descifrarlo (clave cambiada) no hay nada que mandar: queda a la vista.
        await db.brainOutbox.update({
          where: { id: fila.id },
          data: { estado: 'rechazado', ultimoError: 'no se pudo descifrar el evento (¿OBRAS_FIELD_KEY cambió?)' },
        });
        resumen.rechazados++;
      }
    }

    const aplicar = async (lote: { fila: FilaPendiente; evento: EventoBrain }[], r: ResultadoEnvio) => {
      for (const { fila } of lote) {
        if (r.tipo === 'aceptado') {
          await db.brainOutbox.update({
            where: { id: fila.id },
            data: { estado: 'enviado', evento: '', enviadoAt: ahora, ultimoError: null, intentos: fila.intentos + 1 },
          });
          resumen.enviados++;
        } else if (r.tipo === 'rechazado') {
          await db.brainOutbox.update({
            where: { id: fila.id },
            data: { estado: 'rechazado', ultimoError: r.error, intentos: fila.intentos + 1 },
          });
          resumen.rechazados++;
        } else if (r.tipo === 'reintentar') {
          const intentos = fila.intentos + 1;
          await db.brainOutbox.update({
            where: { id: fila.id },
            data: {
              intentos,
              ultimoError: r.error,
              siguienteIntento: new Date(ahora.getTime() + esperaTrasFallos(intentos)),
            },
          });
          resumen.reintentos++;
        }
      }
    };

    if (validas.length) {
      const r = await enviarEventos(validas.map((v) => v.evento), env, opts.fetch);
      if (r.tipo === 'rechazado' && validas.length > 1) {
        for (const v of validas) await aplicar([v], await enviarEventos([v.evento], env, opts.fetch));
      } else {
        await aplicar(validas, r);
      }
    }
    if (resumen.rechazados) console.warn(`[brain] ${resumen.rechazados} evento(s) rechazados por Brain (ver BrainOutbox.ultimoError)`);
    if (resumen.reintentos) console.warn(`[brain] ${resumen.reintentos} evento(s) se reintentarán más tarde`);
    return resumen;
  } catch {
    return { ...resumen, omitido: 'error-bd' };
  } finally {
    enCurso = false;
  }
}

/**
 * Lead que no se pudo guardar en BD (sin BD o con la BD caída): no hay outbox
 * donde dejarlo, así que se intenta una vez directamente. El lead ya está entero
 * en el log del servicio (ADR 0006); la clave sale del correo y el momento.
 */
export function claveLeadSinBd(lead: Lead, ahora: Date): string {
  const huella = createHash('sha256')
    .update(`${lead.email.trim().toLowerCase()}|${ahora.toISOString()}`)
    .digest('hex')
    .slice(0, 24);
  return `lead-log-${huella}`;
}

export async function enviarLeadSinBd(
  lead: Lead,
  ahora: Date = new Date(),
  env: BrainEnv = process.env,
  doFetch?: BrainFetch,
): Promise<ResultadoEnvio & { clave: string }> {
  const clave = claveLeadSinBd(lead, ahora);
  const evento: EventoBrain = { ...eventoContacto(lead, 'x', ahora), clave };
  const r = await enviarEventos([evento], env, doFetch);
  return { ...r, clave };
}

/* ------------------------------------------------------- vaciado periódico */

let temporizador: ReturnType<typeof setInterval> | null = null;

/** Arranca el vaciado cada minuto (una vez por proceso; lo llama `instrumentation.ts`). */
export function iniciarOutboxBrain(cadaMs = 60_000): void {
  if (temporizador) return;
  const tick = () => void procesarOutbox();
  temporizador = setInterval(tick, cadaMs);
  temporizador.unref?.();
  tick();
}
