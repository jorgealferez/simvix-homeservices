/**
 * El middleware de Next corre en el runtime Edge, donde Prisma no funciona.
 * Si algo de su grafo de imports llega a Prisma o al adaptador, cada ruta que
 * protege (`/obras`, `/api/obras`, `/api/organizations`) responde 500 en
 * producción. Este test recorre el grafo desde `src/middleware.ts` y falla si
 * aparece un módulo solo de Node. `npm run test:middleware`.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const RAIZ = resolve(__dirname);
const PROHIBIDOS = ['@prisma/client', '@auth/prisma-adapter', 'node:', 'bcrypt', 'argon2'];
const EXTENSIONES = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

function resolverLocal(desde: string, especificador: string): string | null {
  const base = especificador.startsWith('@/')
    ? join(RAIZ, especificador.slice(2))
    : resolve(dirname(desde), especificador);
  for (const ext of ['', ...EXTENSIONES]) {
    const ruta = base + ext;
    if (existsSync(ruta) && statSync(ruta).isFile()) return ruta;
  }
  return null;
}

function importsDe(fichero: string): string[] {
  const codigo = readFileSync(fichero, 'utf8');
  const res: string[] = [];
  for (const m of codigo.matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    res.push(m[1] ?? m[2]);
  }
  return res;
}

const visitados = new Set<string>();
const fallos: string[] = [];
const pendientes = [join(RAIZ, 'middleware.ts')];

while (pendientes.length) {
  const fichero = pendientes.pop()!;
  if (visitados.has(fichero)) continue;
  visitados.add(fichero);
  for (const esp of importsDe(fichero)) {
    if (PROHIBIDOS.some((p) => esp === p || esp.startsWith(p))) {
      fallos.push(`${fichero.replace(RAIZ, 'src')} importa ${esp}`);
      continue;
    }
    if (esp.startsWith('.') || esp.startsWith('@/')) {
      const local = resolverLocal(fichero, esp);
      if (local) pendientes.push(local);
      else fallos.push(`${fichero.replace(RAIZ, 'src')}: no se resuelve ${esp}`);
    }
  }
}

if (fallos.length) {
  console.error('El middleware (Edge) arrastra módulos solo de Node:\n  ' + fallos.join('\n  '));
  process.exit(1);
}
if (visitados.size < 2) {
  console.error('El test no ha recorrido el grafo: ¿ha cambiado de sitio src/middleware.ts?');
  process.exit(1);
}
console.log(`middleware apto para Edge: ${visitados.size} ficheros recorridos, ninguno importa Prisma`);
