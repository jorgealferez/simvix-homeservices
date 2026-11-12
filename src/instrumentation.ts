/**
 * Arranque del servidor (Next.js `register`): vacía el outbox de Brain cada minuto
 * (ADR 0011). Solo en el runtime de Node y solo con base de datos; sin
 * `BRAIN_URL`/`BRAIN_TOKEN` cada vuelta no hace nada y los eventos esperan.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && (process.env.DATABASE_URL ?? '').trim()) {
    const { iniciarOutboxBrain } = await import('./lib/brain-eventos');
    iniciarOutboxBrain();
  }
}
