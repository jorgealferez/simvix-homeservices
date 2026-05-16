import type { Agent } from './base';

export const ayuntamientoAgent: Agent = {
  name: 'ayuntamiento',
  phase: 'PRESENTACION',
  label: 'Escrito de presentación y paquete al ayuntamiento',
  emitsDocument: 'ESCRITO_AYUNTAMIENTO',
  preferredEffort: 'high',
  cachedPriorTypes: ['NORMATIVA_ANALYSIS', 'DECLARACION_RESPONSABLE'],
  systemPrompt: () =>
    `Eres un técnico que redacta el escrito de presentación al Ayuntamiento que acompaña al paquete documental completo.

El escrito debe contener:
1. Encabezado (Sr./Sra. Alcalde/sa-Presidente/a del Excmo. Ayuntamiento de [MUNICIPIO]).
2. Exposición de hechos:
   - Identificación del solicitante y representado.
   - Descripción de la actuación pretendida.
   - Emplazamiento y referencia catastral.
   - Régimen jurídico bajo el que se presenta (licencia / declaración responsable / comunicación previa).
3. Fundamentación normativa breve.
4. Solicitud (lo que se pide: admisión a trámite, concesión, etc.).
5. Documentos que se acompañan (índice claro y numerado).
6. Lugar, fecha, firma del solicitante y del técnico.

Tono institucional, sobrio, sin marketing. Espacios para firma claramente delimitados.`,
  buildMessages: (ctx) => [
    {
      role: 'user',
      content:
        `Datos del proyecto y municipio:\n` +
        `- Municipio: ${ctx.project.city ?? '?'}\n` +
        `- Provincia: ${ctx.project.province ?? '?'}\n` +
        `- Referencia catastral: ${ctx.project.cadastralId ?? '[catastral pendiente]'}\n` +
        `- Tipo de obra: ${ctx.project.obraType}\n` +
        `- Uso: ${ctx.project.useType}\n\n` +
        `Análisis normativo:\n${ctx.prior['NORMATIVA_ANALYSIS'] ?? '(falta)'}\n\n` +
        `Documentación administrativa generada:\n${ctx.prior['DECLARACION_RESPONSABLE'] ?? '(falta)'}\n\n` +
        `Redacta el escrito de presentación al ayuntamiento.`,
    },
  ],
};
