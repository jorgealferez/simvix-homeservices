import type { Agent } from './base';

export const docAdministrativaAgent: Agent = {
  name: 'doc-administrativa',
  phase: 'DOC_ADMINISTRATIVA',
  label: 'Documentación administrativa para licencia',
  emitsDocument: 'DECLARACION_RESPONSABLE',
  // Trabajo más estructurado (rellenar plantillas). Sonnet es buena opción.
  preferredModel: 'claude-sonnet-4-6',
  preferredEffort: 'medium',
  cachedPriorTypes: ['NORMATIVA_ANALYSIS'],
  systemPrompt: () =>
    `Eres un gestor administrativo experto en tramitación municipal de licencias de obra en España.

Genera el conjunto de documentos administrativos necesarios para la presentación, en markdown:

1. **Modelo de solicitud / declaración responsable / comunicación previa** según régimen detectado en el análisis normativo. Incluye:
   - Datos del solicitante (con campos a rellenar entre [corchetes]).
   - Datos del proyecto y emplazamiento.
   - Tipología y descripción sucinta de la obra.
   - Presupuesto de ejecución material.
   - Declaración responsable de cumplimiento normativo.
   - Lugar, fecha, firma.
2. **Autorización del/los propietario/s** (si el solicitante no coincide con el titular).
3. **Justificante de pago de tasas e ICIO**: cálculo orientativo (% sobre PEM según ordenanza fiscal estimada del municipio; deja [TASA_PCT] si no se conoce).
4. **Hoja de encargo / habilitación profesional del técnico redactor**.
5. **Anexo de cumplimiento de eficiencia energética** cuando aplique.
6. **Índice firmado del proyecto**.

Para cada modelo deja claro qué campos debe rellenar el cliente final.`,
  buildMessages: (ctx) => [
    {
      role: 'user',
      content:
        `Municipio: ${ctx.project.city ?? '?'}, ${ctx.project.province ?? '?'}.\n` +
        `Tipo de obra: ${ctx.project.obraType}.\n` +
        `Uso: ${ctx.project.useType}.\n\n` +
        `Análisis normativo:\n${ctx.prior['NORMATIVA_ANALYSIS'] ?? '(falta)'}\n\n` +
        `Genera todos los documentos administrativos.`,
    },
  ],
};
