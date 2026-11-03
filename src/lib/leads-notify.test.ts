import assert from 'node:assert/strict';
import { BUZON_CENTRAL, cargaPanel, correoLead, notificarLead, type Fetch } from './leads-notify';
import type { Lead } from './leads';

const lead = {
  name: 'Ana <b>', email: 'ana@example.com', phone: '600000000', service: 'limpieza-hogar',
  rol: 'familia', zona: 'parla', origen: 'zona-parla', message: 'hola', consentimiento: true,
} as unknown as Lead;

let n = 0;
const ok = (c: unknown, m: string) => { assert.ok(c, m); n++; };

async function main() {
  // Sin configuración: no hace llamadas y no lanza
  const llamadas: { url: string; body: string }[] = [];
  const f: Fetch = async (url, init) => { llamadas.push({ url, body: String(init.body) }); return { ok: true, status: 200 }; };
  const r0 = await notificarLead(lead, 'x', {}, f);
  ok(r0.email === 'omitido' && r0.panel === 'omitido' && llamadas.length === 0, 'sin config no avisa');

  // Correo al buzón central por omisión, con origen en el asunto y HTML escapado
  const r1 = await notificarLead(lead, 'id1', { RESEND_API_KEY: 'k' }, f);
  ok(r1.email === 'enviado', 'correo enviado');
  const correo = JSON.parse(llamadas[0].body);
  ok(correo.to[0] === BUZON_CENTRAL, 'destino buzón central');
  ok(correo.subject.includes('origen zona-parla') && correo.subject.includes('simvix-homeservices'), 'asunto con origen y sitio');
  ok(!correo.html.includes('<b>') && correo.html.includes('&lt;b&gt;'), 'html escapado');
  ok(correo.reply_to === 'ana@example.com', 'reply-to al cliente');

  // Panel central con origen y dominio
  llamadas.length = 0;
  const r2 = await notificarLead(lead, 'id2', { LEADS_HUB_URL: 'https://hub/x', LEADS_HUB_TOKEN: 't' }, f);
  ok(r2.panel === 'enviado' && r2.email === 'omitido', 'panel enviado');
  const p = JSON.parse(llamadas[0].body);
  ok(p.source_domain === 'homeservices.simvix.com' && p.origen === 'zona-parla' && p.lead_id === 'id2', 'carga con origen');
  ok(cargaPanel(lead, null).sitio === 'simvix-homeservices', 'sitio');

  // Fallos no lanzan
  const roto: Fetch = async () => { throw new Error('red'); };
  const r3 = await notificarLead(lead, null, { RESEND_API_KEY: 'k', LEADS_HUB_URL: 'https://hub' }, roto);
  ok(r3.email === 'error' && r3.panel === 'error', 'errores contenidos');
  ok(correoLead(lead, null).html.includes('sin guardar en BD'), 'sin id');
  console.log(`leads-notify: ${n} aserciones PASS`);
}
main().catch((e) => { console.error(e); process.exit(1); });
