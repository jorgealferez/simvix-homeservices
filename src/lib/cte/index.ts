/**
 * P13-P16 — Cálculos CTE simplificados.
 *
 * Funciones puras que aplican fórmulas de los DBs sin recurrir al LLM. Son
 * cálculos orientativos para chequear cumplimiento mínimo; los proyectos
 * formales deben verificarse con herramientas oficiales (HULC, CE3X, CYPECAD).
 *
 * Cada función recibe datos del proyecto + opcionales y devuelve un resultado
 * estructurado con `complies`, valores calculados, y referencias al artículo.
 */

import type { ObraType, UseType } from '@/lib/obras/enums';

// ---------------------------------------------------------------------------
// DB-HE — Limitación de demanda térmica (HE1, simplificación)
// ---------------------------------------------------------------------------

export type ClimateZone = 'A' | 'B' | 'C' | 'D' | 'E';

/**
 * U_lim (W/m²K) — transmitancia máxima por elemento y zona climática.
 * Valores aproximados del CTE-DB-HE Tabla 3.1.1.a-HE1.
 */
const U_LIM: Record<ClimateZone, Record<'muros' | 'huecos' | 'cubierta' | 'suelo', number>> = {
  A: { muros: 0.94, huecos: 5.7, cubierta: 0.5, suelo: 0.53 },
  B: { muros: 0.82, huecos: 4.2, cubierta: 0.45, suelo: 0.52 },
  C: { muros: 0.73, huecos: 3.5, cubierta: 0.41, suelo: 0.5 },
  D: { muros: 0.66, huecos: 2.9, cubierta: 0.38, suelo: 0.49 },
  E: { muros: 0.57, huecos: 2.5, cubierta: 0.35, suelo: 0.48 },
};

export interface HE1Inputs {
  zone: ClimateZone;
  uMuros: number;
  uHuecos: number;
  uCubierta: number;
  uSuelo: number;
}

export interface HE1ElementCheck {
  measured: number;
  limit: number;
  complies: boolean;
}
export interface HE1Result {
  zone: ClimateZone;
  byElement: {
    muros: HE1ElementCheck;
    huecos: HE1ElementCheck;
    cubierta: HE1ElementCheck;
    suelo: HE1ElementCheck;
  };
  complies: boolean;
  reference: string;
}

export function checkHE1(input: HE1Inputs): HE1Result {
  const lim = U_LIM[input.zone];
  const byElement = {
    muros: { measured: input.uMuros, limit: lim.muros, complies: input.uMuros <= lim.muros },
    huecos: { measured: input.uHuecos, limit: lim.huecos, complies: input.uHuecos <= lim.huecos },
    cubierta: { measured: input.uCubierta, limit: lim.cubierta, complies: input.uCubierta <= lim.cubierta },
    suelo: { measured: input.uSuelo, limit: lim.suelo, complies: input.uSuelo <= lim.suelo },
  };
  return {
    zone: input.zone,
    byElement,
    complies: Object.values(byElement).every((v) => v.complies),
    reference: 'CTE DB-HE, HE1, Tabla 3.1.1.a',
  };
}

// ---------------------------------------------------------------------------
// DB-SI — Ocupación + ancho de evacuación (SI3)
// ---------------------------------------------------------------------------

/** Densidad de ocupación m²/persona según uso (Tabla 2.1 SI3). */
const OCCUPANCY_DENSITY: Partial<Record<UseType, number>> = {
  VIVIENDA: 20,
  OFICINA: 10,
  LOCAL_COMERCIAL: 3,
  HOSTELERIA: 1.5,
  INDUSTRIAL: 40,
  GARAJE: 40,
  TRASTERO: 50,
  OTROS: 10,
};

export interface SI3Inputs {
  useType: UseType;
  usefulAreaM2: number;
  /** Ancho de salida disponible en cm. */
  exitWidthCm: number;
  /** Número de salidas. */
  numExits: number;
}

export interface SI3Result {
  occupancy: number;
  requiredWidthCm: number;
  exitWidthCm: number;
  numExits: number;
  maxEvacuationDistanceM: number;
  complies: boolean;
  issues: string[];
  reference: string;
}

export function checkSI3(input: SI3Inputs): SI3Result {
  const density = OCCUPANCY_DENSITY[input.useType] ?? OCCUPANCY_DENSITY.OTROS!;
  const occupancy = Math.ceil(input.usefulAreaM2 / density);
  const requiredWidthCm = Math.max(80, Math.ceil(occupancy / 200) * 100); // A ≥ P/200, mín 80cm
  const issues: string[] = [];
  if (input.exitWidthCm < requiredWidthCm) {
    issues.push(`Ancho de evacuación insuficiente: ${input.exitWidthCm} cm < ${requiredWidthCm} cm requeridos`);
  }
  if (input.numExits < 1) issues.push('Sin salidas declaradas');
  const maxDistance = input.numExits >= 2 ? 50 : 25;
  return {
    occupancy,
    requiredWidthCm,
    exitWidthCm: input.exitWidthCm,
    numExits: input.numExits,
    maxEvacuationDistanceM: maxDistance,
    complies: issues.length === 0,
    issues,
    reference: 'CTE DB-SI, SI3, Tablas 2.1 y 4.1',
  };
}

// ---------------------------------------------------------------------------
// DB-SUA — Accesibilidad mínima (SUA9)
// ---------------------------------------------------------------------------

export interface SUA9Inputs {
  hasAccessibleItinerary: boolean;
  doorClearWidthCm: number;
  bathroomFreeDiameterCm: number;
  hasElevator?: boolean;
  elevatorCabinCm?: { width: number; depth: number };
}

export interface SUA9Result {
  issues: { area: string; required: string; measured: string; severity: 'alta' | 'media' }[];
  complies: boolean;
  reference: string;
}

export function checkSUA9(input: SUA9Inputs): SUA9Result {
  const issues: SUA9Result['issues'] = [];
  if (!input.hasAccessibleItinerary) {
    issues.push({ area: 'Itinerario', required: 'Presente', measured: 'Ausente', severity: 'alta' });
  }
  if (input.doorClearWidthCm < 80) {
    issues.push({
      area: 'Puerta entrada',
      required: '≥ 80 cm libres',
      measured: `${input.doorClearWidthCm} cm`,
      severity: 'alta',
    });
  }
  if (input.bathroomFreeDiameterCm < 150) {
    issues.push({
      area: 'Aseo accesible',
      required: '∅ ≥ 150 cm',
      measured: `${input.bathroomFreeDiameterCm} cm`,
      severity: 'alta',
    });
  }
  if (input.hasElevator && input.elevatorCabinCm) {
    const { width, depth } = input.elevatorCabinCm;
    if (width < 110 || depth < 140) {
      issues.push({
        area: 'Ascensor',
        required: '110×140 cm',
        measured: `${width}×${depth} cm`,
        severity: 'media',
      });
    }
  }
  return {
    issues,
    complies: issues.length === 0,
    reference: 'CTE DB-SUA, SUA9',
  };
}

// ---------------------------------------------------------------------------
// Instalaciones (P16) — dimensionado básico
// ---------------------------------------------------------------------------

export interface PlumbingResult {
  totalAcometidaDn: number;
  reference: string;
}

/** Aproximación grosera: 1 grifo = 0,1 l/s simultáneos, x coeficiente 0.5. */
export function dimensionPlumbing(fixtureCount: number): PlumbingResult {
  // l/s estimados → Ø en mm (Tabla 4.3 HS4 muy simplificada)
  const flowLps = fixtureCount * 0.1 * 0.5;
  let dn = 20;
  if (flowLps > 0.5) dn = 25;
  if (flowLps > 1.5) dn = 32;
  if (flowLps > 3) dn = 40;
  if (flowLps > 6) dn = 50;
  return { totalAcometidaDn: dn, reference: 'CTE DB-HS4 (simplificación)' };
}

export interface ElectricalResult {
  potenciaMaxAdmisibleKW: number;
  igaCircuitos: { circuito: string; intensidadA: number; seccionMm2: number }[];
  reference: string;
}

/**
 * Grado de electrificación según vivienda (REBT ITC-BT-25):
 * - Básico: 5750 W (≤ 90 m²)
 * - Elevado: 9200 W (> 90 m² o servicios extra)
 */
export function dimensionElectrical(useType: UseType, surfaceM2: number): ElectricalResult {
  const isElevado = surfaceM2 > 90 || useType !== 'VIVIENDA';
  const potencia = isElevado ? 9.2 : 5.75;
  return {
    potenciaMaxAdmisibleKW: potencia,
    igaCircuitos: [
      { circuito: 'C1 iluminación', intensidadA: 10, seccionMm2: 1.5 },
      { circuito: 'C2 tomas generales', intensidadA: 16, seccionMm2: 2.5 },
      { circuito: 'C3 cocina + horno', intensidadA: 25, seccionMm2: 6 },
      { circuito: 'C4 lavadora/lavavajillas', intensidadA: 20, seccionMm2: 4 },
      { circuito: 'C5 baños y aux. cocina', intensidadA: 16, seccionMm2: 2.5 },
      ...(isElevado
        ? [{ circuito: 'C7 tomas adicionales', intensidadA: 16, seccionMm2: 2.5 }]
        : []),
    ],
    reference: 'REBT ITC-BT-25 (grado de electrificación)',
  };
}

// ---------------------------------------------------------------------------
// DB-HR — Aislamiento acústico simplificado (P27)
// ---------------------------------------------------------------------------

export interface HRInputs {
  /** Aislamiento global a ruido aéreo entre recintos protegidos, dBA. */
  dnTaBetweenRooms: number;
  /** Aislamiento a ruido aéreo de fachada, dBA. */
  dnTaFacade: number;
  /** Nivel de presión a ruido de impacto, dB. */
  lnTwImpact: number;
}

export interface HRResult {
  checks: { item: string; measured: number; limit: number; complies: boolean }[];
  complies: boolean;
  reference: string;
}

export function checkHR(input: HRInputs): HRResult {
  const checks = [
    { item: 'Aire entre recintos protegidos', measured: input.dnTaBetweenRooms, limit: 50, complies: input.dnTaBetweenRooms >= 50 },
    { item: 'Aire fachada', measured: input.dnTaFacade, limit: 30, complies: input.dnTaFacade >= 30 },
    { item: 'Impacto entre viviendas', measured: input.lnTwImpact, limit: 65, complies: input.lnTwImpact <= 65 },
  ];
  return { checks, complies: checks.every((c) => c.complies), reference: 'CTE DB-HR, capítulo 2' };
}

// ---------------------------------------------------------------------------
// DB-HS — Salubridad simplificado (P28): HS3 ventilación vivienda
// ---------------------------------------------------------------------------

export interface HS3Inputs {
  flowLps: number;
  numBedrooms: number;
}

export interface HS3Result {
  required_lps: number;
  measured_lps: number;
  complies: boolean;
  reference: string;
}

export function checkHS3(input: HS3Inputs): HS3Result {
  /** Vivienda: 8 l/s por dormitorio + 12 l/s sala/comedor */
  const required = 8 * input.numBedrooms + 12;
  return {
    required_lps: required,
    measured_lps: input.flowLps,
    complies: input.flowLps >= required,
    reference: 'CTE DB-HS3, Tabla 2.1',
  };
}

// ---------------------------------------------------------------------------
// DB-SE — Pre-dimensionado estructural simplificado (P29)
// ---------------------------------------------------------------------------

export interface SEPreSizingInputs {
  spanM: number;
  liveLoadKnM2: number;
}

export interface SEPreSizingResult {
  estimatedSlabDepthCm: number;
  totalLoadKnM2: number;
  reference: string;
  notes: string[];
}

/** Pre-dimensionado de canto h ≥ L/22 (sanity check, NO cálculo definitivo). */
export function preSizeSE(input: SEPreSizingInputs): SEPreSizingResult {
  const factor = input.liveLoadKnM2 > 4 ? 18 : 22;
  const slab = Math.ceil((input.spanM * 100) / factor / 5) * 5;
  const selfWeight = (slab / 100) * 25;
  return {
    estimatedSlabDepthCm: slab,
    totalLoadKnM2: selfWeight + 1 + input.liveLoadKnM2,
    reference: 'CTE DB-SE-AE + DB-SE pre-dimensionado',
    notes: [
      'Resultado orientativo; el cálculo definitivo requiere CYPECAD o equivalente.',
      'No considera vibraciones, fisuración ni acciones accidentales.',
    ],
  };
}

// ---------------------------------------------------------------------------
// Reporte agregado para un proyecto
// ---------------------------------------------------------------------------

export interface ProjectCteSummaryInputs {
  obraType: ObraType;
  useType: UseType;
  surfaceM2: number;
  zone?: ClimateZone;
  envelope?: { uMuros: number; uHuecos: number; uCubierta: number; uSuelo: number };
  evacuation?: { exitWidthCm: number; numExits: number };
  accessibility?: SUA9Inputs;
  fixtures?: number;
}

export function summarize(inputs: ProjectCteSummaryInputs) {
  const out: Record<string, unknown> = {};
  if (inputs.zone && inputs.envelope) {
    out.HE1 = checkHE1({ zone: inputs.zone, ...inputs.envelope });
  }
  if (inputs.evacuation) {
    out.SI3 = checkSI3({
      useType: inputs.useType,
      usefulAreaM2: inputs.surfaceM2,
      ...inputs.evacuation,
    });
  }
  if (inputs.accessibility) {
    out.SUA9 = checkSUA9(inputs.accessibility);
  }
  if (inputs.fixtures) {
    out.HS4 = dimensionPlumbing(inputs.fixtures);
    out.REBT = dimensionElectrical(inputs.useType, inputs.surfaceM2);
  }
  return out;
}
