import type { Agent, AgentResult } from './base';
import { tryExtractJson } from '@/lib/ai/client';
import { prisma } from '@/lib/db';

interface MeasurementItem {
  chapter: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
}

export const medicionesAgent: Agent = {
  name: 'mediciones',
  phase: 'MEDICIONES',
  label: 'Mediciones de la obra',
  emitsDocument: 'MEDICIONES',
  systemPrompt: () =>
    `Eres un técnico mediciones senior. A partir de la memoria y el anteproyecto, generas un listado realista de partidas de medición.

Devuelve TANTO:
1. Una tabla markdown legible para humanos (capítulo, código, descripción, unidad, cantidad).
2. Un bloque \`\`\`json con un array \`items\` de objetos { chapter, code, description, unit, quantity }.

Capítulos típicos a contemplar (omite los que no apliquen): 01 Demoliciones, 02 Movimiento de tierras, 03 Cimentación, 04 Estructura, 05 Cubiertas, 06 Albañilería, 07 Carpintería, 08 Revestimientos, 09 Instalaciones fontanería, 10 Instalaciones eléctricas, 11 Climatización, 12 Saneamiento, 13 Aislamientos, 14 Vidrios, 15 Pinturas, 16 Urbanización exterior, 17 Seguridad y salud, 18 Gestión de residuos, 19 Control de calidad, 20 Imprevistos.

No incluyas precios; sólo mediciones.`,
  buildMessages: (ctx) => [
    {
      role: 'user',
      content:
        `Memoria técnica:\n${ctx.prior['MEMORIA_DESCRIPTIVA'] ?? '(falta)'}\n\n` +
        `Anteproyecto:\n${ctx.prior['ANTEPROYECTO'] ?? '(falta)'}\n\n` +
        `Superficie aproximada: ${ctx.project.surfaceM2 ?? '?'} m².\n` +
        `Tipo de obra: ${ctx.project.obraType}.\n\n` +
        `Genera mediciones realistas y el JSON estructurado.`,
    },
  ],
  postProcess: async (ctx, raw): Promise<AgentResult> => {
    const parsed = tryExtractJson<{ items: MeasurementItem[] }>(raw.text);
    if (parsed?.items?.length) {
      // Mediciones no incluye precio: lo dejamos en resultJson de Phase para
      // que el agente de presupuesto lo recoja.
      await prisma.phase.upsert({
        where: { projectId_type: { projectId: ctx.project.id, type: 'MEDICIONES' as string } },
        update: { resultJson: JSON.stringify(parsed) },
        create: {
          projectId: ctx.project.id,
          type: 'MEDICIONES',
          order: 5,
          resultJson: JSON.stringify(parsed),
        },
      });
    }
    return {
      ok: true,
      outputText: raw.text,
      outputJson: parsed,
      documentType: 'MEDICIONES',
      documentTitle: 'Mediciones',
      usage: {
        model: raw.model,
        inputTokens: raw.inputTokens,
        outputTokens: raw.outputTokens,
        costUsd: raw.costUsd,
        mocked: raw.mocked,
      },
    };
  },
};
