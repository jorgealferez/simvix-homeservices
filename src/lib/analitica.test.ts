/**
 * Tests de la analitica con consentimiento (ADR 0012): `npm run test:analitica`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gaMeasurementId } from './analitica';

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

console.log('analitica: ID de medicion por variable de entorno');
assert(gaMeasurementId({}) === null, 'sin variable no hay ID');
assert(gaMeasurementId({ GA_MEASUREMENT_ID: 'UA-1234-1' }) === null, 'un ID de Universal Analytics no vale');
assert(gaMeasurementId({ GA_MEASUREMENT_ID: ' g-abcd1234 ' }) === 'G-ABCD1234', 'normaliza espacios y mayusculas');
assert(
  gaMeasurementId({ NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-PUBLICO1', GA_MEASUREMENT_ID: 'G-SERVIDOR1' }) === 'G-PUBLICO1',
  'la variable de compilacion gana',
);

console.log('analitica: nada de Google antes de aceptar');
const js = readFileSync(join(process.cwd(), 'public/simvix-analitica.js'), 'utf8');
assert(js.includes('if (v === "si") cargar();'), 'gtag solo se carga con la eleccion "si"');
assert(js.indexOf('googletagmanager.com/gtag/js') > js.indexOf('function cargar()'), 'la URL de gtag solo vive dentro de cargar()');
assert(js.includes('boton("Rechazar", "no")') && js.includes('boton("Aceptar", "si")'), 'Rechazar y Aceptar al mismo nivel');
const layout = readFileSync(join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
assert(layout.includes('gaMeasurementId()') && layout.includes('/simvix-analitica.js'), 'el layout raiz (web y portal) incluye el script');

console.log(`\n${count - failures}/${count} comprobaciones`);
if (failures) process.exit(1);
