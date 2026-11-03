/**
 * Límite de frecuencia en memoria por clave (IP), ventana deslizante. Basta
 * para una instancia; con varias réplicas cada una lleva su cuenta (ADR 0006).
 */
export function crearLimitador(max: number, ventanaMs: number) {
  const golpes = new Map<string, number[]>();
  return function permitir(clave: string, ahora: number = Date.now()): boolean {
    const desde = ahora - ventanaMs;
    const previos = (golpes.get(clave) ?? []).filter((t) => t > desde);
    if (previos.length >= max) {
      golpes.set(clave, previos);
      return false;
    }
    previos.push(ahora);
    golpes.set(clave, previos);
    if (golpes.size > 10_000) {
      for (const [k, v] of golpes) if (v.every((t) => t <= desde)) golpes.delete(k);
    }
    return true;
  };
}

/** IP del cliente tras el proxy (Railway añade x-forwarded-for). */
export function ipDe(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'desconocida';
}
