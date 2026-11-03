/**
 * El módulo /obras solo se sirve si tiene base de datos **y** se ha activado
 * de forma explícita con `OBRAS_HABILITADO=true`. Desde el ADR 0007 la web
 * tiene Postgres en producción (para los leads de Home Services), así que la
 * base de datos ya no basta como señal: encender /obras es una decisión de
 * alcance aparte (ver ADR 0005 y 0007).
 */
export function obrasDisponible(env: Record<string, string | undefined> = process.env): boolean {
  return (env.DATABASE_URL ?? '').trim() !== '' && (env.OBRAS_HABILITADO ?? '').trim() === 'true';
}
