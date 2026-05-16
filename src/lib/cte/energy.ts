/**
 * P30 — Simulación energética simplificada (HULC-lite).
 *
 * Estimación de demanda térmica anual con un modelo de grados-día, no un
 * cálculo riguroso. Sirve para tener una cifra orientativa y poder comparar
 * envolventes. La certificación oficial sigue requiriendo HULC o CE3X.
 */

import type { ClimateZone, HE1Inputs } from './';

/** Grados-día calefacción anuales aproximados por zona climática. */
const HDD: Record<ClimateZone, number> = {
  A: 700,
  B: 1100,
  C: 1500,
  D: 2000,
  E: 2700,
};

/** Grados-día refrigeración anuales aproximados. */
const CDD: Record<ClimateZone, number> = {
  A: 400,
  B: 350,
  C: 250,
  D: 150,
  E: 80,
};

export interface EnergyInputs extends HE1Inputs {
  /** Área útil m² */
  areaM2: number;
  /** Superficie de envolvente fachada (m²) */
  envelopeAreaM2: number;
  /** Superficie de cubierta (m²) */
  roofAreaM2: number;
  /** Superficie de huecos (m²) */
  windowAreaM2: number;
  /** Superficie de suelo en contacto con terreno o exterior (m²) */
  floorAreaM2: number;
}

export interface EnergyResult {
  heatingKwhM2Y: number;
  coolingKwhM2Y: number;
  totalKwhM2Y: number;
  /** Letra estimada A-G (orientativo). */
  letter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  reference: string;
}

/**
 * U·A (W/K) total de la envolvente. Demanda anual ≈ U·A × HDD × 24 / area.
 */
export function estimateEnergyDemand(input: EnergyInputs): EnergyResult {
  const UA =
    input.uMuros * input.envelopeAreaM2 +
    input.uHuecos * input.windowAreaM2 +
    input.uCubierta * input.roofAreaM2 +
    input.uSuelo * input.floorAreaM2;

  // Conversión: W·K → kWh/año = (UA[W/K] × HDD[K·día] × 24h) / 1000.
  const heating = (UA * HDD[input.zone] * 24) / 1000 / input.areaM2;
  // Refrigeración estimada como 40% del UA en CDD (peso mucho menor).
  const cooling = (UA * 0.4 * CDD[input.zone] * 24) / 1000 / input.areaM2;
  const total = heating + cooling;

  let letter: EnergyResult['letter'] = 'G';
  if (total < 15) letter = 'A';
  else if (total < 30) letter = 'B';
  else if (total < 50) letter = 'C';
  else if (total < 75) letter = 'D';
  else if (total < 100) letter = 'E';
  else if (total < 150) letter = 'F';

  return {
    heatingKwhM2Y: Math.round(heating * 10) / 10,
    coolingKwhM2Y: Math.round(cooling * 10) / 10,
    totalKwhM2Y: Math.round(total * 10) / 10,
    letter,
    reference: 'Modelo grados-día (HULC-lite, orientativo)',
  };
}
