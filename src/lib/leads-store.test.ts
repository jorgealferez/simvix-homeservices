/**
 * `npm run test:leads`: guardado de leads en BD (ADR 0006), cifrado, log sin
 * datos personales, límite de frecuencia y páginas legales con datos reales.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { leadSchema } from './leads';
import { filaLead, guardarLead, hayBaseDeDatos, resumenLead, type LeadDb, type LeadRow } from './leads-store';
import { crearLimitador, ipDe } from './rate-limit';
import { decrypt, deterministicHash, isEncrypted } from './security/crypto';
import { TITULAR } from './site';
import sitemap from '../app/sitemap';

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

function fakeDb(falla = false): { db: LeadDb; filas: LeadRow[] } {
  const filas: LeadRow[] = [];
  return {
    filas,
    db: {
      lead: {
        async create({ data }) {
          if (falla) throw new Error('db caída');
          filas.push(data);
          return { id: `lead_${filas.length}` };
        },
      },
    },
  };
}

async function main() {
  console.log('fila cifrada');
  const ahora = new Date('2026-11-03T20:00:00Z');
  const fila = filaLead(lead, ahora);
  assert([fila.nombre, fila.email, fila.telefono, fila.mensaje].every((v) => isEncrypted(v)), 'nombre, email, teléfono y mensaje se guardan cifrados');
  assert(decrypt(fila.email) === 'ana@example.com', 'el email se normaliza a minúsculas y se descifra');
  assert(decrypt(fila.nombre) === 'Ana López', 'el nombre se descifra igual');
  assert(fila.emailHash === deterministicHash('ana@example.com'), 'emailHash permite localizar a la persona sin descifrar');
  assert(fila.consentimientoAt.getTime() === ahora.getTime(), 'se guarda el momento del consentimiento');
  assert(fila.zona === 'parla' && fila.rol === 'familia' && fila.servicio === 'limpieza-hogar' && fila.origen === 'facebook:clientes-parla', 'campos de segmentación en claro');
  const sinOpc = filaLead(leadSchema.parse({ ...lead, phone: '', message: '' }));
  assert(sinOpc.telefono === null && sinOpc.mensaje === null, 'teléfono y mensaje vacíos quedan en null');

  console.log('guardado');
  assert(!hayBaseDeDatos({}) && !hayBaseDeDatos({ DATABASE_URL: ' ' }) && hayBaseDeDatos({ DATABASE_URL: 'file:./dev.db' }), 'hayBaseDeDatos sigue DATABASE_URL');
  const sin = await guardarLead(lead, { env: {}, db: fakeDb().db });
  assert(!sin.guardado && sin.motivo === 'sin-bd', 'sin DATABASE_URL no se intenta escribir');
  const sinClave = await guardarLead(lead, { env: { DATABASE_URL: 'postgresql://x', NODE_ENV: 'production' }, db: fakeDb().db });
  assert(!sinClave.guardado && sinClave.motivo === 'sin-clave', 'en producción sin OBRAS_FIELD_KEY no se escribe (no se cifra con clave provisional)');
  const conClave = await guardarLead(lead, { env: { DATABASE_URL: 'postgresql://x', NODE_ENV: 'production', OBRAS_FIELD_KEY: 'k' }, db: fakeDb().db });
  assert(conClave.guardado, 'en producción con OBRAS_FIELD_KEY sí se escribe');
  const f = fakeDb();
  const ok = await guardarLead(lead, { env: { DATABASE_URL: 'file:x' }, db: f.db });
  assert(ok.guardado && ok.id === 'lead_1' && f.filas.length === 1, 'con BD se escribe una fila');
  const ko = await guardarLead(lead, { env: { DATABASE_URL: 'file:x' }, db: fakeDb(true).db });
  assert(!ko.guardado && ko.motivo === 'error-bd', 'un fallo de BD no lanza: devuelve error-bd');
  const resumen = JSON.stringify(resumenLead(lead));
  assert(!/Ana|example|600|80 m2/.test(resumen), 'el resumen para el log no lleva datos personales');

  console.log('límite de frecuencia');
  const permitir = crearLimitador(5, 600_000);
  const t0 = 1_000_000;
  const r = [0, 1, 2, 3, 4, 5].map((i) => permitir('1.2.3.4', t0 + i));
  assert(r.slice(0, 5).every(Boolean) && r[5] === false, '5 envíos permitidos, el sexto bloqueado');
  assert(permitir('5.6.7.8', t0 + 6), 'otra IP no se ve afectada');
  assert(permitir('1.2.3.4', t0 + 600_001), 'pasada la ventana se vuelve a permitir');
  assert(ipDe(new Headers({ 'x-forwarded-for': '9.9.9.9, 10.0.0.1' })) === '9.9.9.9', 'la IP sale del primer x-forwarded-for');

  console.log('esquema y páginas legales');
  const schema = readFileSync(join(__dirname, '../../prisma/schema.prisma'), 'utf8');
  assert(/model Lead \{[\s\S]*emailHash[\s\S]*@@index\(\[emailHash\]\)/.test(schema), 'prisma/schema.prisma define Lead con índice por emailHash');
  const adr = readFileSync(join(__dirname, '../../docs/adr/0006-los-leads-se-guardan-cifrados-en-una-tabla-propia.md'), 'utf8');
  for (const sec of ['Contexto', 'Necesidad', 'Escalabilidad', 'Coherencia', 'Alternativas consideradas', 'Necesidades futuras', 'Migracion y reversibilidad', 'Decision', 'Verificacion', 'Alcance', 'Seguridad']) {
    assert(adr.includes(`## ${sec}`), `ADR 0006 tiene la sección ${sec}`);
  }
  assert(adr.includes('**Tipo:** datos') && adr.includes('`prisma/schema.prisma`'), 'ADR 0006 es Tipo: datos y cubre prisma/schema.prisma');
  assert(TITULAR.cif === 'B87816419' && /BYTEMEGA/.test(TITULAR.razonSocial), 'titular con razón social y CIF del usuario');
  assert(TITULAR.domicilio === 'Calle Bramante, 45200 Illescas (Toledo), España' && TITULAR.email === 'support@simvix.com', 'domicilio y correo del titular: Calle Bramante, Illescas');
  assert(TITULAR.registroMercantil === null, 'los datos registrales no se inventan');
  const urls = sitemap().map((e) => e.url);
  assert(['/aviso-legal', '/privacidad', '/condiciones'].every((p) => urls.some((u) => u.endsWith(p))), 'las páginas legales están en el sitemap');
  const form = readFileSync(join(__dirname, '../components/ContactForm.tsx'), 'utf8');
  assert(form.includes('href="/privacidad"'), 'el formulario enlaza la política de privacidad');

  console.log(`\n${failures === 0 ? `✓ Todos los tests OK (${count} aserciones)` : `✘ ${failures} fallos de ${count}`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
