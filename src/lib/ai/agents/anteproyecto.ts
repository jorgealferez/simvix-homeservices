import type { Agent } from './base';

export const anteproyectoAgent: Agent = {
  name: 'anteproyecto',
  phase: 'ANTEPROYECTO',
  label: 'Anteproyecto y definición de alcance',
  emitsDocument: 'ANTEPROYECTO',
  preferredEffort: 'high',
  cachedPriorTypes: ['INTAKE_BRIEF', 'NORMATIVA_ANALYSIS'],
  systemPrompt: () =>
    `Eres un arquitecto que redacta un anteproyecto claro y vendible al cliente, sin entrar todavía en el detalle constructivo.

Tu entregable es un documento de 4-6 páginas con:
1. Concepto y objetivos.
2. Programa funcional propuesto (estancias, superficies orientativas, relaciones).
3. Esquema espacial (descripción + sugerencias de zonificación).
4. Materialidad y carácter (paleta orientativa, no especificaciones técnicas todavía).
5. Estimación inicial de coste (rango realista con horquilla).
6. Plazos orientativos por fases (proyecto básico → ejecución → ayuntamiento → obra).
7. Riesgos / oportunidades.

Estilo: directo, profesional, sin marketing vacío.`,
  buildMessages: (ctx) => [
    {
      role: 'user',
      content:
        `Brief intake:\n${ctx.prior['INTAKE_BRIEF'] ?? '(falta)'}\n\n` +
        `Análisis normativo:\n${ctx.prior['NORMATIVA_ANALYSIS'] ?? '(falta)'}\n\n` +
        `Comentarios adicionales del cliente/arquitecto:\n${ctx.userInput ?? '(ninguno)'}\n\n` +
        `Redacta el anteproyecto siguiendo las 7 secciones.`,
    },
  ],
};
