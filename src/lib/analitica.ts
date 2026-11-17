/**
 * Google Analytics 4 con consentimiento previo (ADR 0012). El ID de medicion llega por variable de
 * entorno (lo envia Simvix Brain a Railway); sin un `G-` valido no se pinta nada y la web no carga
 * nada de Google. `public/simvix-analitica.js` solo carga gtag.js tras «Aceptar».
 */
const MEASUREMENT_ID = /^G-[A-Z0-9]{4,20}$/;

export function gaMeasurementId(env: Record<string, string | undefined> = process.env): string | null {
  const raw = (env.NEXT_PUBLIC_GA_MEASUREMENT_ID || env.GA_MEASUREMENT_ID || '').trim().toUpperCase();
  return MEASUREMENT_ID.test(raw) ? raw : null;
}
