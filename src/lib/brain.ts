/**
 * Cliente mínimo de Brain (simvix-brain): telemetría de automatizaciones con IA.
 *
 * Contrato: `POST $BRAIN_URL/api/ia/ejecuciones` con `Authorization: Bearer $BRAIN_TOKEN`
 * (ver docs/automatizaciones/conectar.md en simvix-brain).
 *
 * Reglas que no se negocian:
 *   - Sin `BRAIN_URL`/`BRAIN_TOKEN` no hace nada.
 *   - Nunca lanza: un fallo de red o un 5xx se traga (como mucho un `console.warn`
 *     con el mensaje del error, nunca con el token).
 *   - Timeout de 5 s; no bloquea al servicio (los llamadores no esperan la promesa).
 *   - Sin dependencias: usa el `fetch` global del runtime.
 */

export type BrainTipo = 'tarea' | 'agente' | 'asistente' | 'flujo' | 'webhook';
export type BrainEstado = 'ok' | 'error' | 'en-curso';

export interface BrainRun {
  /** Identificador estable de la automatización (p. ej. `intake`, `chat-normativa`). */
  automatizacion: string;
  nombre?: string;
  descripcion?: string;
  url?: string;
  tipo?: BrainTipo;
  proveedor?: string;
  modelo?: string;
  cada_segundos?: number;
  id?: string;
  estado?: BrainEstado;
  inicio?: string;
  fin?: string;
  duracion_ms?: number;
  tokens_entrada?: number;
  tokens_salida?: number;
  coste_usd?: number;
  resumen?: string;
  error?: string;
}

/** Subconjunto de variables que lee el cliente (`process.env` o un objeto de test). */
export type BrainEnv = Record<string, string | undefined>;

export interface BrainOptions {
  /** `fetch` inyectable (tests). Por defecto, el global del runtime. */
  fetch?: typeof fetch;
  /** Variables inyectables (tests). Por defecto, `process.env`. */
  env?: BrainEnv;
  /** Timeout en ms (por defecto 5000). */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5000;

export function brainConfigured(env: BrainEnv = process.env): boolean {
  return Boolean(env.BRAIN_URL && env.BRAIN_TOKEN);
}

/**
 * Informa una ejecución a Brain. Resuelve `true` si Brain la aceptó y `false` en
 * cualquier otro caso (sin configurar, error de red, respuesta no 2xx). Nunca rechaza.
 */
export async function reportToBrain(run: BrainRun, opts: BrainOptions = {}): Promise<boolean> {
  const env = opts.env ?? process.env;
  const url = env.BRAIN_URL;
  const token = env.BRAIN_TOKEN;
  if (!url || !token) return false;

  const doFetch = opts.fetch ?? globalThis.fetch;
  if (typeof doFetch !== 'function') return false;

  try {
    const res = await doFetch(`${url.replace(/\/+$/, '')}/api/ia/ejecuciones`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(trim(run)),
      signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[brain] Brain respondió ${res.status} al informar '${run.automatizacion}'`);
      return false;
    }
    return true;
  } catch (err) {
    // Nunca se registra el token ni se relanza: Brain no puede romper al servicio.
    const raw = err instanceof Error ? err.message : String(err);
    const msg = raw.split(token).join('[BRAIN_TOKEN]');
    console.warn(`[brain] no se pudo informar '${run.automatizacion}': ${msg}`);
    return false;
  }
}

/** Recorta los textos a los límites del contrato y elimina claves `undefined`. */
function trim(run: BrainRun): BrainRun {
  const out: BrainRun = { ...run };
  if (out.resumen && out.resumen.length > 1000) out.resumen = out.resumen.slice(0, 1000);
  if (out.error && out.error.length > 2000) out.error = out.error.slice(0, 2000);
  for (const k of Object.keys(out) as Array<keyof BrainRun>) {
    if (out[k] === undefined) delete out[k];
  }
  return out;
}
