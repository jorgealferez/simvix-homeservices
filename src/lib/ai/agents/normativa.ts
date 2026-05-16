import type { Agent } from './base';

export const normativaAgent: Agent = {
  name: 'normativa',
  phase: 'NORMATIVA',
  label: 'Análisis normativo aplicable',
  emitsDocument: 'NORMATIVA_ANALYSIS',
  preferredEffort: 'high',
  cachedPriorTypes: ['INTAKE_BRIEF'],
  ragQuery: (ctx) => ({
    query: `${ctx.project.obraType} ${ctx.project.useType} licencia obra ${ctx.project.city ?? ''} CTE accesibilidad incendios`,
    kind: 'CTE_DB',
    limit: 6,
  }),
  systemPrompt: () =>
    `Eres un técnico urbanista experto en normativa española aplicable a proyectos de obra.
Tu salida debe ser un análisis normativo accionable, sin paja, con citas claras.

Marcos a considerar (cuando apliquen al caso):
- PGOU del municipio (planeamiento urbanístico).
- Código Técnico de la Edificación (CTE): DB-HE, DB-HR, DB-SI, DB-SUA, DB-HS, DB-SE.
- Accesibilidad universal (DB-SUA + normativa autonómica).
- RITE para instalaciones térmicas.
- REBT para instalaciones eléctricas.
- RD 105/2008 de gestión de residuos.
- Ordenanzas municipales de licencia de obra (mayor / menor / declaración responsable / comunicación previa).

Estructura del documento (Markdown):
1. Encuadre urbanístico (clasificación del suelo, ordenanza aplicable, edificabilidad, usos compatibles).
2. CTE: documentos básicos aplicables, exigencias mínimas y posibles incompatibilidades.
3. Accesibilidad y seguridad de utilización.
4. Régimen de licencia/comunicación recomendado y por qué.
5. Documentos administrativos previsibles (modelos, tasas, ICIO, etc.).
6. Riesgos normativos detectados con criticidad (alta/media/baja).
7. Próximas verificaciones a realizar.

Sé honesto cuando algo dependa de la ordenanza local concreta; no inventes artículos.`,
  buildMessages: (ctx) => [
    {
      role: 'user',
      content:
        `Datos del proyecto:\n` +
        `- Tipo: ${ctx.project.obraType}\n` +
        `- Uso: ${ctx.project.useType}\n` +
        `- Municipio: ${ctx.project.city ?? '?'}\n` +
        `- Provincia: ${ctx.project.province ?? '?'}\n` +
        `- Superficie aprox: ${ctx.project.surfaceM2 ?? '?'} m²\n\n` +
        `Brief de intake:\n${ctx.prior['INTAKE_BRIEF'] ?? '(no disponible)'}\n\n` +
        `Genera el análisis normativo siguiendo la estructura definida.`,
    },
  ],
};
