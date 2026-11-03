/**
 * El módulo /obras solo se sirve si tiene base de datos. Sin `DATABASE_URL`
 * cada página reventaba con un 500 (`PrismaClientInitializationError`); ahora
 * el layout de /obras responde 404 con la página de la web. Activarlo de
 * verdad (Postgres, migraciones, AUTH_TRUST_HOST) es una decisión aparte:
 * ver `## Hecho` en PENDIENTES.simvix-homeservices.md y ADR 0005.
 */
export function obrasDisponible(env: Record<string, string | undefined> = process.env): boolean {
  return (env.DATABASE_URL ?? '').trim() !== '';
}
