/**
 * `npm run test:brain-eventos`: outbox y emisor de eventos hacia Brain (ADR 0011).
 *
 *   - mapeo del lead a `contacto` (clave lead-<id>, teléfono, utm, asunto, url);
 *   - sin BRAIN_URL/BRAIN_TOKEN no se hace ninguna petición y nada sale del outbox;
 *   - 202 → enviado (y se vacía la copia cifrada); 400 → rechazado sin reintento;
 *     404, 5xx, red caída → reintento con espera creciente;
 *   - un 400 de un lote se aísla reenviando uno a uno;
 *   - el token nunca aparece en el error guardado.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  claveLeadSinBd,
  datosContacto,
  enviarEventos,
  enviarLeadSinBd,
  esperaTrasFallos,
  eventoContacto,
  filaOutbox,
  procesarOutbox,
  telefonoBrain,
  utmDeOrigen,
  type BrainFetch,
  type EventoBrain,
  type FilaPendiente,
  type OutboxDb,
} from './brain-eventos';
import { leadSchema } from './leads';
import { decrypt, isEncrypted } from './security/crypto';

let failures = 0;
let count = 0;
function assert(cond: boolean, msg: string) {
  count++;
  if (cond) console.log('  ✔', msg);
  else {
    failures++;
    console.error('  ✘', msg);
  }
}

const TOKEN = 'sb_secreto_de_prueba_123';
const ENV = { BRAIN_URL: 'https://brain.example/', BRAIN_TOKEN: TOKEN };

const lead = leadSchema.parse({
  name: 'Ana López',
  email: 'Ana@Example.com',
  phone: '+34 600 111 222',
  service: 'limpieza-hogar',
  rol: 'familia',
  zona: 'parla',
  message: 'Piso de 80 m2, los martes',
  consentimiento: true,
  origen: 'facebook:clientes-parla',
});

type Llamada = { url: string; init: RequestInit; eventos: EventoBrain[] };
function fakeFetch(respuestas: (n: number, eventos: EventoBrain[]) => number | Error) {
  const llamadas: Llamada[] = [];
  const f: BrainFetch = async (url, init) => {
    const eventos = (JSON.parse(String(init.body)) as { eventos: EventoBrain[] }).eventos;
    llamadas.push({ url, init, eventos });
    const r = respuestas(llamadas.length, eventos);
    if (r instanceof Error) throw r;
    return { status: r, text: async () => (r === 400 ? 'eventos[0].datos.email: no es un correo valido' : 'x') };
  };
  return { f, llamadas };
}

function fakeOutbox(eventos: EventoBrain[]) {
  const filas = eventos.map((e, i) => ({
    id: `ob_${i + 1}`,
    intentos: 0,
    estado: 'pendiente',
    ultimoError: null as string | null,
    enviadoAt: null as Date | null,
    ...filaOutbox(e, new Date('2026-11-12T10:00:00Z')),
  }));
  const db: OutboxDb = {
    brainOutbox: {
      async findMany({ where, take }) {
        return filas
          .filter((r) => r.estado === where.estado && r.siguienteIntento <= where.siguienteIntento.lte)
          .slice(0, take)
          .map((r): FilaPendiente => ({ id: r.id, clave: r.clave, evento: r.evento, intentos: r.intentos }));
      },
      async update({ where, data }) {
        const r = filas.find((x) => x.id === where.id)!;
        Object.assign(r, data);
        return r;
      },
    },
  };
  return { db, filas };
}

async function main() {
  console.log('mapeo a contacto');
  const ocurrido = new Date('2026-11-12T09:30:00Z');
  const ev = eventoContacto(lead, 'cm123', ocurrido);
  const d = datosContacto(lead);
  assert(JSON.stringify(ev.datos) === JSON.stringify(d), 'el evento lleva los datos de contacto');
  assert(ev.tipo === 'contacto' && ev.clave === 'lead-cm123', 'tipo contacto y clave lead-<id>');
  assert(ev.ocurrido_en === '2026-11-12T09:30:00.000Z', 'ocurrido_en es la hora del lead');
  assert(d.nombre === 'Ana López' && d.email === 'ana@example.com', 'nombre y email (normalizado)');
  assert(d.telefono === '+34600111222', 'teléfono en dígitos con el +');
  assert(d.canal === 'formulario' && d.mensaje === 'Piso de 80 m2, los martes', 'canal formulario y mensaje');
  assert(/Limpieza/i.test(d.asunto) && d.asunto.includes('Parla') && d.asunto.startsWith('Familia'), 'asunto con rol, servicio y zona');
  assert(d.url.startsWith('https://') && d.url.endsWith('/contacto'), 'url https de la página del formulario');
  assert(d.utm?.source === 'facebook' && d.utm?.campaign === 'clientes-parla', 'utm desde origen (source:campaign)');
  assert(d.origen.includes('Formulario') && d.origen.length <= 200, 'origen legible y dentro del límite');
  assert(!('marca' in ev), 'sin marca: Brain usa la del conector');
  assert(telefonoBrain('12345') === undefined && telefonoBrain('') === undefined && telefonoBrain('(91) 123-45-67') === '911234567', 'teléfono fuera de 6-16 dígitos se omite');
  assert(utmDeOrigen('') === undefined && utmDeOrigen('zona-parla')?.source === 'zona-parla' && utmDeOrigen('zona-parla')?.campaign === undefined, 'origen sin campaña: solo source');
  const sinOpc = datosContacto(leadSchema.parse({ ...lead, phone: '', message: '', origen: '' }));
  assert(!('telefono' in sinOpc) && !('mensaje' in sinOpc) && !('utm' in sinOpc), 'lo vacío no se envía');

  console.log('fila del outbox');
  const fila = filaOutbox(ev);
  assert(isEncrypted(fila.evento) && !fila.evento.includes('Ana'), 'el evento se guarda cifrado');
  assert(JSON.parse(decrypt(fila.evento) as string).clave === 'lead-cm123', 'y se recupera entero');

  console.log('envío');
  const sinCfg = fakeFetch(() => 202);
  assert((await enviarEventos([ev], {}, sinCfg.f)).tipo === 'sin-config' && sinCfg.llamadas.length === 0, 'sin BRAIN_URL/BRAIN_TOKEN no hay petición');
  assert((await enviarEventos([ev], { BRAIN_URL: 'https://b' }, sinCfg.f)).tipo === 'sin-config', 'sin token tampoco');
  const ok = fakeFetch(() => 202);
  assert((await enviarEventos([ev], ENV, ok.f)).tipo === 'aceptado', '202 = aceptado');
  const h = ok.llamadas[0].init.headers as Record<string, string>;
  assert(ok.llamadas[0].url === 'https://brain.example/api/eventos' && h.authorization === `Bearer ${TOKEN}`, 'POST a /api/eventos con Bearer');
  assert(ok.llamadas[0].eventos.length === 1 && ok.llamadas[0].eventos[0].clave === 'lead-cm123', 'cuerpo {eventos:[...]}');
  for (const [status, tipo] of [[400, 'rechazado'], [401, 'reintentar'], [404, 'reintentar'], [429, 'reintentar'], [500, 'reintentar'], [503, 'reintentar'], [200, 'reintentar']] as const) {
    const r = await enviarEventos([ev], ENV, fakeFetch(() => status).f);
    assert(r.tipo === tipo, `HTTP ${status} → ${tipo}`);
  }
  const red = await enviarEventos([ev], ENV, fakeFetch(() => new Error(`fallo conectando con token ${TOKEN}`)).f);
  assert(red.tipo === 'reintentar' && 'error' in red && !red.error.includes(TOKEN) && red.error.includes('[BRAIN_TOKEN]'), 'red caída → reintentar, sin el token en el error');

  console.log('espera entre reintentos');
  assert(esperaTrasFallos(1) === 30_000 && esperaTrasFallos(2) === 60_000 && esperaTrasFallos(3) === 120_000, '30 s, 1 min, 2 min...');
  assert(esperaTrasFallos(50) === 3_600_000, 'tope de 1 h');

  console.log('outbox');
  const ahora = new Date('2026-11-12T10:00:00Z');
  const e1 = eventoContacto(lead, 'a1', ocurrido);
  const e2 = eventoContacto(lead, 'a2', ocurrido);
  const e3 = eventoContacto(leadSchema.parse({ ...lead, email: 'b@example.com' }), 'a3', ocurrido);

  const sc = fakeOutbox([e1]);
  const scf = fakeFetch(() => 202);
  const r0 = await procesarOutbox({ db: sc.db, env: {}, fetch: scf.f, ahora });
  assert(r0.omitido === 'sin-config' && scf.llamadas.length === 0 && sc.filas[0].estado === 'pendiente', 'sin configuración: no-op y el evento sigue pendiente');

  const o = fakeOutbox([e1, e2]);
  const of = fakeFetch(() => 202);
  const r1 = await procesarOutbox({ db: o.db, env: ENV, fetch: of.f, ahora });
  assert(r1.enviados === 2 && of.llamadas.length === 1 && of.llamadas[0].eventos.length === 2, '202: un lote, los dos enviados');
  assert(o.filas.every((x) => x.estado === 'enviado' && x.evento === '' && x.enviadoAt !== null), 'enviado: se vacía la copia cifrada y se apunta la hora');
  const r1b = await procesarOutbox({ db: o.db, env: ENV, fetch: of.f, ahora });
  assert(r1b.enviados === 0 && of.llamadas.length === 1, 'lo enviado no se reenvía');

  const c = fakeOutbox([e1]);
  const cf = fakeFetch((n) => (n === 1 ? 503 : 202));
  const r2 = await procesarOutbox({ db: c.db, env: ENV, fetch: cf.f, ahora });
  assert(r2.reintentos === 1 && c.filas[0].estado === 'pendiente' && c.filas[0].intentos === 1, '5xx: sigue pendiente con un intento');
  assert(c.filas[0].siguienteIntento.getTime() === ahora.getTime() + 30_000 && (c.filas[0].ultimoError ?? '').includes('503'), 'reintento a los 30 s con el error apuntado');
  const r2b = await procesarOutbox({ db: c.db, env: ENV, fetch: cf.f, ahora: new Date(ahora.getTime() + 10_000) });
  assert(r2b.enviados === 0 && cf.llamadas.length === 1, 'antes de su hora no se reintenta');
  const r2c = await procesarOutbox({ db: c.db, env: ENV, fetch: cf.f, ahora: new Date(ahora.getTime() + 31_000) });
  assert(r2c.enviados === 1 && c.filas[0].estado === 'enviado', 'llegada su hora, 202 y enviado: no se pierde');

  const n = fakeOutbox([e1]);
  await procesarOutbox({ db: n.db, env: ENV, fetch: fakeFetch(() => 404).f, ahora });
  assert(n.filas[0].estado === 'pendiente', '404 (Brain sin la ruta todavía) se reintenta');
  await procesarOutbox({ db: n.db, env: ENV, fetch: fakeFetch(() => new Error('ECONNREFUSED')).f, ahora: new Date(ahora.getTime() + 60_000) });
  assert(n.filas[0].estado === 'pendiente' && n.filas[0].intentos === 2 && n.filas[0].siguienteIntento.getTime() === ahora.getTime() + 60_000 + 60_000, 'red caída: segundo intento, espera de 1 min');

  const b = fakeOutbox([e1, e2, e3]);
  // El lote entero da 400 (todo o nada); uno a uno solo falla a2.
  const bf = fakeFetch((_n, evs) => (evs.some((x) => x.clave === 'lead-a2') ? 400 : 202));
  const r3 = await procesarOutbox({ db: b.db, env: ENV, fetch: bf.f, ahora });
  assert(bf.llamadas.length === 4 && r3.enviados === 2 && r3.rechazados === 1, '400 en lote: se reenvía uno a uno y se aísla el malo');
  assert(b.filas[1].estado === 'rechazado' && (b.filas[1].ultimoError ?? '').includes('400') && b.filas[1].evento !== '', 'rechazado: no se reintenta y conserva el evento para revisarlo');
  const r3b = await procesarOutbox({ db: b.db, env: ENV, fetch: bf.f, ahora: new Date(ahora.getTime() + 3_600_000) });
  assert(r3b.rechazados === 0 && bf.llamadas.length === 4, 'lo rechazado no vuelve a salir');

  const roto = fakeOutbox([e1]);
  roto.filas[0].evento = 'enc:v1:basura';
  const r4 = await procesarOutbox({ db: roto.db, env: ENV, fetch: fakeFetch(() => 202).f, ahora });
  assert(r4.rechazados === 1 && roto.filas[0].estado === 'rechazado', 'un evento que no se puede descifrar queda rechazado a la vista, sin bloquear la cola');

  const tok = fakeOutbox([e1]);
  await procesarOutbox({ db: tok.db, env: ENV, fetch: fakeFetch(() => new Error(`timeout Bearer ${TOKEN}`)).f, ahora });
  assert(!(tok.filas[0].ultimoError ?? '').includes(TOKEN), 'el token nunca se guarda en ultimoError');

  console.log('lead sin base de datos');
  const t = new Date('2026-11-12T11:00:00Z');
  assert(claveLeadSinBd(lead, t) === claveLeadSinBd(lead, t) && claveLeadSinBd(lead, t).startsWith('lead-log-'), 'clave estable para el reintento idempotente');
  const sb = fakeFetch(() => 202);
  const rs = await enviarLeadSinBd(lead, t, ENV, sb.f);
  assert(rs.tipo === 'aceptado' && sb.llamadas[0].eventos[0].clave === rs.clave && sb.llamadas[0].eventos[0].datos.email === 'ana@example.com', 'sin BD: un envío directo con su clave');
  const sbn = fakeFetch(() => 202);
  assert((await enviarLeadSinBd(lead, t, {}, sbn.f)).tipo === 'sin-config' && sbn.llamadas.length === 0, 'sin BD y sin configuración: nada');

  console.log('esquema, migración y documentación');
  const raiz = join(__dirname, '../..');
  const schema = readFileSync(join(raiz, 'prisma/schema.prisma'), 'utf8');
  assert(/model BrainOutbox \{[\s\S]*clave\s+String\s+@unique[\s\S]*@@index\(\[estado, siguienteIntento\]\)/.test(schema), 'BrainOutbox con clave única e índice de pendientes');
  const sql = readFileSync(join(raiz, 'prisma/migrations/1_brain_outbox/migration.sql'), 'utf8');
  assert(sql.includes('CREATE TABLE "BrainOutbox"') && sql.includes('"BrainOutbox_clave_key"'), 'migración versionada 1_brain_outbox');
  const adr = readFileSync(join(raiz, 'docs/adr/0011-cada-lead-se-envia-a-brain-por-un-outbox-durable.md'), 'utf8');
  for (const sec of ['Contexto', 'Necesidad', 'Escalabilidad', 'Coherencia', 'Alternativas consideradas', 'Necesidades futuras', 'Migracion y reversibilidad', 'Decision', 'Verificacion', 'Alcance', 'Seguridad']) {
    assert(adr.includes(`## ${sec}`), `ADR 0011 tiene la sección ${sec}`);
  }
  assert(adr.includes('**Tipo:** datos'), 'ADR 0011 es Tipo: datos');
  const readme = readFileSync(join(raiz, 'README.md'), 'utf8');
  const envEx = readFileSync(join(raiz, '.env.example'), 'utf8');
  assert(readme.includes('/api/eventos') && envEx.includes('/api/eventos'), 'README y .env.example explican BRAIN_URL/BRAIN_TOKEN para los eventos');

  console.log(`\n${failures === 0 ? `✓ Todos los tests OK (${count} aserciones)` : `✘ ${failures} fallos de ${count}`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
