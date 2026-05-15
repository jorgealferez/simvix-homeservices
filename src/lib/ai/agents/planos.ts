import type { Agent } from './base';

/**
 * El agente de planos no genera CAD/DXF (eso queda como integración fuera de
 * alcance de esta PR), pero sí produce:
 *  - Listado de planos necesarios según tipología de obra
 *  - Anotaciones / leyendas / criterios de representación
 *  - Indicaciones para el delineante humano o herramienta CAD/IA externa
 */
export const planosAgent: Agent = {
  name: 'planos',
  phase: 'PLANOS',
  label: 'Plan de planos del proyecto',
  emitsDocument: 'PLANO',
  systemPrompt: () =>
    `Eres un jefe de delineación. Para el proyecto dado, define el plan de planos completo y mínimo exigible.

Devuelve markdown con tabla: código, título, escala, categoría, contenido esperado, prioridad (alta/media/baja).

Categorías típicas: SITUACION, EMPLAZAMIENTO, ESTADO_ACTUAL, ESTADO_REFORMADO, COTAS_Y_SUPERFICIES, INSTALACIONES_FONTANERIA, INSTALACIONES_ELECTRICAS, INSTALACIONES_SANEAMIENTO, INSTALACIONES_CLIMA, CARPINTERIA, ALZADOS, SECCIONES, DETALLES.

Considera obligatorios para licencia: SITUACION, EMPLAZAMIENTO, ESTADO_ACTUAL si hay preexistencia, ESTADO_REFORMADO, COTAS_Y_SUPERFICIES. Cuando intervienen instalaciones, añade los específicos.

Indica también qué planos requieren visado colegial cuando aplique.`,
  buildMessages: (ctx) => [
    {
      role: 'user',
      content:
        `Tipo de obra: ${ctx.project.obraType}\n` +
        `Uso: ${ctx.project.useType}\n` +
        `Superficie: ${ctx.project.surfaceM2 ?? '?'} m²\n\n` +
        `Anteproyecto:\n${ctx.prior['ANTEPROYECTO'] ?? '(falta)'}\n\n` +
        `Memoria técnica:\n${ctx.prior['MEMORIA_DESCRIPTIVA'] ?? '(falta)'}\n\n` +
        `Define el plan de planos.`,
    },
  ],
};
