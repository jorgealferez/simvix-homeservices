/**
 * `npm run test:obras-disponible`: el módulo /obras se apaga sin base de datos.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { obrasDisponible } from './disponible';

const casos: [Record<string, string | undefined>, boolean, string][] = [
  [{}, false, 'sin DATABASE_URL'],
  [{ DATABASE_URL: '' }, false, 'DATABASE_URL vacía'],
  [{ DATABASE_URL: '   ' }, false, 'DATABASE_URL en blanco'],
  [{ DATABASE_URL: 'postgresql://u:p@h:5432/db' }, false, 'con Postgres pero sin OBRAS_HABILITADO (ADR 0007)'],
  [{ DATABASE_URL: 'postgresql://u:p@h:5432/db', OBRAS_HABILITADO: 'false' }, false, 'OBRAS_HABILITADO=false'],
  [{ DATABASE_URL: 'postgresql://u:p@h:5432/db', OBRAS_HABILITADO: 'true' }, true, 'con Postgres y OBRAS_HABILITADO=true'],
  [{ OBRAS_HABILITADO: 'true' }, false, 'OBRAS_HABILITADO sin base de datos'],
];

let fallos = 0;
for (const [env, esperado, nombre] of casos) {
  if (obrasDisponible(env) !== esperado) {
    console.error(`FALLA ${nombre}: esperaba ${esperado}`);
    fallos++;
  }
}

// El layout de /obras es quien aplica la regla: si deja de llamarla, vuelve el 500.
const layout = readFileSync(join(__dirname, '../../app/obras/layout.tsx'), 'utf8');
if (!/obrasDisponible\(\)/.test(layout) || !/notFound\(\)/.test(layout)) {
  console.error('FALLA src/app/obras/layout.tsx ya no apaga /obras sin base de datos (obrasDisponible + notFound)');
  fallos++;
}

if (fallos) process.exit(1);
console.log(`obras disponible: ${casos.length} casos y el layout, OK`);
