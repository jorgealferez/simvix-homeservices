import type { Agent } from './base';

export const residuosAgent: Agent = {
  name: 'residuos',
  phase: 'GESTION_RESIDUOS',
  label: 'Estudio de gestión de residuos (RD 105/2008)',
  emitsDocument: 'GESTION_RESIDUOS',
  systemPrompt: () =>
    `Eres un técnico ambiental. Rediga el Estudio de Gestión de Residuos de Construcción y Demolición (RCD) según RD 105/2008 y normativa autonómica aplicable.

Estructura:
1. Identificación de los residuos previsibles (códigos LER de la Decisión 2014/955/UE / Lista Europea de Residuos): clasificación nivel I (excedentes de excavación) y nivel II (residuos no peligrosos / peligrosos).
2. Cuantificación estimada (t y m³).
3. Medidas para prevención.
4. Operaciones de reutilización, valorización o eliminación previstas, gestor autorizado.
5. Medidas de separación en obra (umbrales del RD 105/2008 según volumen).
6. Pliego de condiciones.
7. Mediciones y presupuesto del estudio.
8. Planos de ubicación de las instalaciones para gestión en obra (descripción textual, no plano).

Sé realista con cuantificaciones (ratios habituales kg/m² construido para reforma vs obra nueva).`,
  buildMessages: (ctx) => [
    {
      role: 'user',
      content:
        `Tipo de obra: ${ctx.project.obraType}\n` +
        `Superficie: ${ctx.project.surfaceM2 ?? '?'} m²\n\n` +
        `Memoria técnica:\n${ctx.prior['MEMORIA_DESCRIPTIVA'] ?? '(falta)'}\n\n` +
        `Redacta el estudio de gestión de residuos.`,
    },
  ],
};
