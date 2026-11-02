/**
 * Tests de la captación local (zonas, JSON-LD, leads, sitemap, robots y
 * llms.txt). Sin framework, mismo estilo que src/lib/brain.test.ts:
 * `npm run test:zonas`.
 */

import { zonas, getZona, vecinasDe, zonaPorCodigoPostal, ofertaEmpleo } from './zonas';
import {
  faqJsonLd,
  faqsEmpleo,
  faqsModelo,
  faqsZona,
  jobPostingJsonLd,
  organizationJsonLd,
  serializeJsonLd,
  zonaServiceJsonLd,
} from './seo';
import { leadSchema } from './leads';
import { buildLlmsTxt } from './llms';
import sitemap from '../app/sitemap';
import robots from '../app/robots';

let failures = 0;
let count = 0;

function assert(cond: boolean, msg: string) {
  count++;
  if (cond) {
    console.log('  ✔', msg);
  } else {
    failures++;
    console.error('  ✘', msg);
  }
}

function main() {
  console.log('zonas: datos coherentes');
  const slugs = zonas.map((z) => z.slug);
  assert(zonas.length >= 9, `al menos 9 zonas de captación (hay ${zonas.length})`);
  assert(new Set(slugs).size === slugs.length, 'slugs únicos');
  assert(slugs.every((s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)), 'slugs en kebab-case ASCII');
  assert(zonas[0].slug === 'parla' && zonas[0].prioridad === 'piloto', 'Parla es la primera zona y es piloto');
  const cps = zonas.flatMap((z) => z.codigosPostales);
  assert(cps.every((cp) => /^28\d{3}$/.test(cp)), 'todos los CP son de la provincia de Madrid (28xxx)');
  assert(new Set(cps).size === cps.length, 'ningún CP está en dos zonas');
  assert(
    zonas.every((z) => z.geo.lat > 40 && z.geo.lat < 40.6 && z.geo.lng > -4.1 && z.geo.lng < -3.5),
    'coordenadas dentro del área metropolitana de Madrid',
  );
  assert(zonas.every((z) => z.vecinas.every((v) => getZona(v) && v !== z.slug)), 'vecinas existen y no son la propia zona');
  assert(
    zonas.every((z) => z.vecinas.every((v) => getZona(v)!.vecinas.includes(z.slug))),
    'la vecindad es simétrica (si A cubre B, B cubre A)',
  );
  assert(zonas.every((z) => z.contexto.length >= 60), 'cada zona tiene contexto propio (página no duplicada)');
  assert(new Set(zonas.map((z) => z.contexto)).size === zonas.length, 'ningún contexto se repite');
  assert(zonaPorCodigoPostal('28981')?.slug === 'parla', 'el CP 28981 cae en Parla');
  assert(zonaPorCodigoPostal(' 28320 ')?.slug === 'pinto', 'el CP con espacios cae en Pinto');
  assert(zonaPorCodigoPostal('08001') === undefined, 'un CP de fuera no cae en ninguna zona');
  assert(vecinasDe(getZona('parla')!).length === 4, 'Parla tiene 4 vecinas');

  console.log('seo: JSON-LD');
  const parla = getZona('parla')!;
  const org = organizationJsonLd();
  assert(org['@type'] === 'HousekeepingService', 'la organización es un HousekeepingService');
  assert(Array.isArray(org.areaServed) && (org.areaServed as unknown[]).length === zonas.length, 'areaServed lista todas las zonas');
  const svc = zonaServiceJsonLd(parla) as { areaServed: { name: string }; offers: { price: number } };
  assert(svc.areaServed.name === 'Parla' && svc.offers.price === 25, 'Service de Parla con área y precio 25 €/h');
  const job = jobPostingJsonLd(parla);
  for (const k of ['title', 'description', 'datePosted', 'validThrough', 'hiringOrganization', 'jobLocation', 'employmentType']) {
    assert(k in job, `JobPosting tiene ${k}`);
  }
  assert(
    ofertaEmpleo.salarioHoraBrutoDesde !== null || !('baseSalary' in job),
    'sin salario fijado no se publica baseSalary (no se inventa una cifra)',
  );
  assert(String(job.validThrough) > String(job.datePosted), 'validThrough es posterior a datePosted');
  const faq = faqJsonLd(faqsZona(parla)) as { mainEntity: unknown[] };
  assert(faq.mainEntity.length === faqsZona(parla).length, 'FAQPage refleja las preguntas visibles');
  assert(faqsZona(parla)[1].respuesta.includes('28980'), 'la FAQ de zona cita sus códigos postales');
  assert(faqsEmpleo(parla).some((f) => /nunca cobramos/i.test(f.respuesta)), 'la FAQ de empleo deja claro que no se cobra a las profesionales');
  assert(faqsModelo.every((f) => f.respuesta.length <= 320), 'respuestas cortas y citables (<= 320 caracteres)');
  const ser = serializeJsonLd({ x: '</script><script>alert(1)</script>' });
  assert(!ser.includes('</script>'), 'serializeJsonLd no deja cerrar la etiqueta <script>');

  console.log('leads: validación del formulario');
  const ok = {
    name: 'Ana López',
    email: 'ana@example.com',
    service: 'limpieza-hogar',
    rol: 'profesional',
    zona: 'parla',
    consentimiento: true,
    origen: 'facebook:captacion-parla',
  };
  assert(leadSchema.safeParse(ok).success, 'un lead válido pasa');
  assert(!leadSchema.safeParse({ ...ok, consentimiento: false }).success, 'sin consentimiento se rechaza');
  assert(!leadSchema.safeParse({ ...ok, zona: 'barcelona' }).success, 'una zona desconocida se rechaza');
  assert(leadSchema.safeParse({ ...ok, zona: 'otra' }).success, '"otra" zona se acepta');
  assert(!leadSchema.safeParse({ ...ok, service: 'x' }).success, 'un servicio desconocido se rechaza');
  assert(!leadSchema.safeParse({ ...ok, email: 'no-email' }).success, 'un email inválido se rechaza');
  assert(!leadSchema.safeParse({ ...ok, origen: '<script>' }).success, 'un origen con caracteres raros se rechaza');
  const def = leadSchema.safeParse({ ...ok, rol: undefined, zona: undefined });
  assert(def.success && def.data.rol === 'familia' && def.data.zona === 'otra', 'rol y zona tienen valores por defecto');

  console.log('sitemap, robots y llms.txt');
  const urls = sitemap().map((e) => e.url);
  assert(zonas.every((z) => urls.some((u) => u.endsWith(`/zonas/${z.slug}`))), 'el sitemap incluye todas las /zonas/*');
  assert(zonas.every((z) => urls.some((u) => u.endsWith(`/empleo/${z.slug}`))), 'el sitemap incluye todas las /empleo/*');
  assert(urls.some((u) => u.endsWith('/como-funciona')), 'el sitemap incluye /como-funciona');
  assert(new Set(urls).size === urls.length, 'el sitemap no repite URLs');
  assert(!urls.some((u) => /\/(obras|portal|api)(\/|$)/.test(u)), 'el sitemap no expone áreas privadas');
  const r = robots();
  const reglas = Array.isArray(r.rules) ? r.rules : [r.rules];
  const ua = reglas.flatMap((x) => (Array.isArray(x.userAgent) ? x.userAgent : [x.userAgent ?? '']));
  for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) {
    assert(ua.includes(bot), `robots nombra a ${bot}`);
  }
  assert(reglas.every((x) => (Array.isArray(x.disallow) ? x.disallow : [x.disallow]).includes('/obras/')), 'robots cierra /obras/ a todos');
  const llms = buildLlmsTxt();
  assert(llms.startsWith('# Simvix Home Services'), 'llms.txt empieza con el nombre');
  assert(zonas.every((z) => llms.includes(`/zonas/${z.slug}`)), 'llms.txt enlaza todas las zonas');
  assert(llms.includes('25 €'), 'llms.txt cita el precio');

  console.log(`\n${failures === 0 ? `✓ Todos los tests OK (${count} aserciones)` : `✘ ${failures} fallos de ${count}`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
