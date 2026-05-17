/**
 * Tests unitarios para los cálculos CTE. Sin framework: ejecuta con
 *   `npx tsx --tsconfig tsconfig.json src/lib/cte/index.test.ts`
 *
 * Mantenemos los tests aquí para tenerlos junto al código. Cuando llegue
 * P03-bis con suite Vitest/Jest, migramos a `describe`/`it`.
 */

import { checkHE1, checkSI3, checkSUA9, checkHR, checkHS3, preSizeSE, dimensionPlumbing, dimensionElectrical } from './index';
import { estimateEnergyDemand } from './energy';

let failures = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log('  ✔', msg);
  } else {
    failures++;
    console.error('  ✘', msg);
  }
}

console.log('\n— HE1: transmitancia térmica —');
const he1ok = checkHE1({ zone: 'D', uMuros: 0.5, uHuecos: 2.5, uCubierta: 0.3, uSuelo: 0.4 });
assert(he1ok.complies, 'Envolvente conforme cumple en zona D');
assert(he1ok.byElement.muros.complies, 'U muros < 0.66 cumple');
const he1bad = checkHE1({ zone: 'D', uMuros: 1.2, uHuecos: 2.5, uCubierta: 0.3, uSuelo: 0.4 });
assert(!he1bad.complies, 'U muros 1.2 NO cumple en zona D');

console.log('\n— SI3: evacuación —');
const si3ok = checkSI3({ useType: 'VIVIENDA', usefulAreaM2: 100, exitWidthCm: 90, numExits: 1 });
assert(si3ok.complies, 'Vivienda 100m² con 1 salida 90cm cumple');
assert(si3ok.occupancy === Math.ceil(100 / 20), 'Ocupación = ceil(100/20)');
const si3bad = checkSI3({ useType: 'HOSTELERIA', usefulAreaM2: 600, exitWidthCm: 80, numExits: 1 });
assert(!si3bad.complies, 'Hostelería 600m² 1 salida 80cm NO cumple');
assert(si3bad.occupancy === 400, 'Hostelería 600/1.5 = 400 personas');

console.log('\n— SUA9: accesibilidad —');
const suaOk = checkSUA9({
  hasAccessibleItinerary: true,
  doorClearWidthCm: 80,
  bathroomFreeDiameterCm: 150,
});
assert(suaOk.complies, 'SUA9 mínimo cumple');
const suaFail = checkSUA9({
  hasAccessibleItinerary: false,
  doorClearWidthCm: 70,
  bathroomFreeDiameterCm: 140,
});
assert(!suaFail.complies, '70cm puerta + 140cm aseo NO cumple');
assert(suaFail.issues.length === 3, 'Detecta 3 problemas');

console.log('\n— HR: acústica —');
const hrOk = checkHR({ dnTaBetweenRooms: 52, dnTaFacade: 35, lnTwImpact: 60 });
assert(hrOk.complies, 'Aislamiento adecuado cumple');
const hrFail = checkHR({ dnTaBetweenRooms: 45, dnTaFacade: 28, lnTwImpact: 70 });
assert(!hrFail.complies, 'Aislamiento bajo NO cumple');

console.log('\n— HS3: ventilación vivienda —');
const hs3ok = checkHS3({ flowLps: 40, numBedrooms: 3 });
assert(hs3ok.complies, 'Vivienda 3 dorm con 40 l/s cumple (req 36)');
const hs3bad = checkHS3({ flowLps: 30, numBedrooms: 3 });
assert(!hs3bad.complies, 'Vivienda 3 dorm con 30 l/s NO cumple');

console.log('\n— SE: pre-sizing forjado —');
const seq = preSizeSE({ spanM: 5, liveLoadKnM2: 2 });
assert(seq.estimatedSlabDepthCm >= 22 && seq.estimatedSlabDepthCm <= 25, `Canto 5m con sobrecarga 2 → ~25cm (got ${seq.estimatedSlabDepthCm})`);

console.log('\n— Instalaciones —');
const plumb = dimensionPlumbing(10);
assert(plumb.totalAcometidaDn >= 20, 'DN acometida ≥ 20mm');
const elec = dimensionElectrical('VIVIENDA', 120);
assert(elec.potenciaMaxAdmisibleKW === 9.2, 'Vivienda > 90m² → grado elevado (9.2 kW)');
const elecBasico = dimensionElectrical('VIVIENDA', 60);
assert(elecBasico.potenciaMaxAdmisibleKW === 5.75, 'Vivienda < 90m² → grado básico (5.75 kW)');

console.log('\n— Energía HULC-lite —');
const energy = estimateEnergyDemand({
  zone: 'D',
  uMuros: 0.5,
  uHuecos: 2.5,
  uCubierta: 0.3,
  uSuelo: 0.4,
  areaM2: 100,
  envelopeAreaM2: 100,
  roofAreaM2: 100,
  windowAreaM2: 20,
  floorAreaM2: 100,
});
assert(energy.totalKwhM2Y > 0, 'Demanda positiva');
assert(['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(energy.letter), `Letra válida: ${energy.letter}`);

console.log(`\n${failures === 0 ? '✓ Todos los tests OK' : `✘ ${failures} fallos`}`);
process.exit(failures === 0 ? 0 : 1);
