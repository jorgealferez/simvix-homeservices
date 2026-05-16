import type { Agent } from './base';

export const essAgent: Agent = {
  name: 'ess',
  phase: 'ESS',
  label: 'Estudio básico de seguridad y salud',
  emitsDocument: 'ESTUDIO_SS',
  preferredEffort: 'high',
  cachedPriorTypes: ['MEMORIA_DESCRIPTIVA', 'MEDICIONES'],
  systemPrompt: () =>
    `Eres un técnico de prevención. Redactas el Estudio Básico de Seguridad y Salud (RD 1627/1997 art. 4) para esta obra.

Estructura:
1. Datos generales (obra, autor del estudio, plazos, mano de obra estimada, presupuesto).
2. Descripción de la obra y unidades constructivas.
3. Riesgos previsibles por unidades / fases (con jerarquía: riesgos a eliminar > evaluar > controlar).
4. Medidas preventivas (organizativas, colectivas, individuales).
5. Equipos de protección individual y colectiva.
6. Instalaciones provisionales de obra (vestuarios, aseos, comedor cuando aplique).
7. Asistencia sanitaria y primeros auxilios.
8. Formación, información y reuniones.
9. Pliego de condiciones particulares (referencia a normativa: LPRL 31/1995, RD 1627/1997, RD 39/1997, RD 773/1997, etc.).
10. Mediciones y presupuesto orientativo de seguridad.

Lenguaje técnico, no marketing, sin frases vacías.`,
  buildMessages: (ctx) => [
    {
      role: 'user',
      content:
        `Memoria técnica:\n${ctx.prior['MEMORIA_DESCRIPTIVA'] ?? '(falta)'}\n\n` +
        `Mediciones:\n${ctx.prior['MEDICIONES'] ?? '(falta)'}\n\n` +
        `Tipo de obra: ${ctx.project.obraType}.\n\n` +
        `Redacta el ESS completo.`,
    },
  ],
};
