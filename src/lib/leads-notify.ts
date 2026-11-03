import type { Lead } from './leads';

/**
 * Centralización de contactos (ADR 0010): además de su función en esta web,
 * cada lead se avisa por correo al buzón central y se envía al panel central
 * del grupo con su origen (sitio + `origen` del formulario).
 *
 * - Correo: Resend (`RESEND_API_KEY`, o `OBRAS_RESEND_API_KEY` si ya existe) a
 *   `LEADS_NOTIFY_EMAIL` (por omisión, el buzón central del grupo).
 * - Panel central: POST JSON a `LEADS_HUB_URL` con `Authorization: Bearer
 *   LEADS_HUB_TOKEN`.
 * - Sin configuración, cada canal se omite sin error. Nunca lanza: un fallo de
 *   aviso no puede perder ni bloquear el lead (ya guardado o en el log).
 */

export const BUZON_CENTRAL = 'jorge.alferez.adan@gmail.com';
export const SITIO = 'simvix-homeservices';
export const DOMINIO = 'homeservices.simvix.com';

export type Env = Record<string, string | undefined>;
export type Fetch = (url: string, init: RequestInit) => Promise<{ ok: boolean; status: number }>;

export interface ResultadoAviso {
  email: 'enviado' | 'omitido' | 'error';
  panel: 'enviado' | 'omitido' | 'error';
}

export function cargaPanel(lead: Lead, id: string | null, ahora: Date = new Date()) {
  return {
    sitio: SITIO,
    source_domain: DOMINIO,
    origen: lead.origen,
    lead_id: id,
    rol: lead.rol,
    servicio: lead.service,
    zona: lead.zona,
    name: lead.name,
    email: lead.email,
    phone: lead.phone || null,
    message: lead.message || null,
    consent_rgpd: true,
    recibido_at: ahora.toISOString(),
  };
}

function escapar(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}

export function correoLead(lead: Lead, id: string | null) {
  const asunto = `[${SITIO}] Nuevo contacto (${lead.rol}) — ${lead.service} · ${lead.zona} · origen ${lead.origen}`;
  const filas: [string, string][] = [
    ['Web', `${DOMINIO} (${SITIO})`],
    ['Origen', lead.origen],
    ['Rol', lead.rol],
    ['Servicio', lead.service],
    ['Zona', lead.zona],
    ['Nombre', lead.name],
    ['Email', lead.email],
    ['Teléfono', lead.phone || '—'],
    ['Mensaje', lead.message || '—'],
    ['Id', id ?? 'sin guardar en BD (ver log)'],
  ];
  const html = `<table cellpadding="6" style="font-family:Inter,Arial,sans-serif;font-size:14px;color:#0B1220">${filas
    .map(([k, v]) => `<tr><td style="color:#5B6476">${k}</td><td><strong>${escapar(v)}</strong></td></tr>`)
    .join('')}</table>`;
  return { asunto, html, replyTo: lead.email };
}

async function conTiempo<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([p, new Promise<T>((_, rej) => (t = setTimeout(() => rej(new Error('timeout')), ms)))]);
  } finally {
    if (t) clearTimeout(t);
  }
}

export async function notificarLead(
  lead: Lead,
  id: string | null,
  env: Env = process.env,
  doFetch: Fetch = fetch as unknown as Fetch,
): Promise<ResultadoAviso> {
  const res: ResultadoAviso = { email: 'omitido', panel: 'omitido' };
  const tareas: Promise<void>[] = [];

  const resendKey = (env.RESEND_API_KEY || env.OBRAS_RESEND_API_KEY || '').trim();
  if (resendKey) {
    const { asunto, html, replyTo } = correoLead(lead, id);
    tareas.push(
      conTiempo(
        doFetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { authorization: `Bearer ${resendKey}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            from: env.LEADS_FROM_EMAIL || 'Simvix Leads <onboarding@resend.dev>',
            to: [(env.LEADS_NOTIFY_EMAIL || BUZON_CENTRAL).trim()],
            reply_to: replyTo,
            subject: asunto,
            html,
          }),
        }),
        8000,
      )
        .then((r) => void (res.email = r.ok ? 'enviado' : 'error'))
        .catch(() => void (res.email = 'error')),
    );
  }

  const hubUrl = (env.LEADS_HUB_URL || '').trim();
  if (hubUrl) {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (env.LEADS_HUB_TOKEN) headers.authorization = `Bearer ${env.LEADS_HUB_TOKEN}`;
    tareas.push(
      conTiempo(doFetch(hubUrl, { method: 'POST', headers, body: JSON.stringify(cargaPanel(lead, id)) }), 8000)
        .then((r) => void (res.panel = r.ok ? 'enviado' : 'error'))
        .catch(() => void (res.panel = 'error')),
    );
  }

  await Promise.all(tareas);
  return res;
}
