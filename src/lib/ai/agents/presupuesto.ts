import type { Agent, AgentResult } from './base';
import { tryExtractJson } from '@/lib/ai/client';
import { prisma } from '@/lib/db';

interface BudgetItemInput {
  chapter: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  source?: string;
}

export const presupuestoAgent: Agent = {
  name: 'presupuesto',
  phase: 'PRESUPUESTO',
  label: 'Presupuesto valorado',
  emitsDocument: 'PRESUPUESTO',
  systemPrompt: () =>
    `Eres un técnico de presupuestos. A partir de las mediciones, asignas precios unitarios realistas para España (orientativos 2025-2026) y construyes el presupuesto.

Devuelve:
1. Tabla markdown por capítulo con código, descripción, unidad, cantidad, precio unitario y total.
2. Totales por capítulo y total general (PEM, Presupuesto de Ejecución por Contrata = PEM × 1,19 que añade GG 13% + BI 6%, y total con IVA 21% sobre PEC).
3. Bloque \`\`\`json con array \`items\` ({ chapter, code, description, unit, quantity, unitPrice, source }). Indica en \`source\` el catálogo orientativo (CYPE, BEDEC, libre).

Precios honestos. Si dudas, da una horquilla razonable y elige el punto medio.`,
  buildMessages: (ctx) => [
    {
      role: 'user',
      content:
        `Mediciones (texto/markdown):\n${ctx.prior['MEDICIONES'] ?? '(falta)'}\n\n` +
        `Memoria técnica:\n${ctx.prior['MEMORIA_DESCRIPTIVA'] ?? '(falta)'}\n\n` +
        `Municipio: ${ctx.project.city ?? '?'} (ajusta precios al nivel de mercado local).\n\n` +
        `Genera el presupuesto valorado completo.`,
    },
  ],
  postProcess: async (ctx, raw): Promise<AgentResult> => {
    const parsed = tryExtractJson<{ items: BudgetItemInput[] }>(raw.text);

    if (parsed?.items?.length) {
      // Reemplaza los items existentes del proyecto
      await prisma.budgetItem.deleteMany({ where: { projectId: ctx.project.id } });
      await prisma.budgetItem.createMany({
        data: parsed.items.map((it) => ({
          projectId: ctx.project.id,
          chapter: it.chapter,
          code: it.code,
          description: it.description,
          unit: it.unit,
          quantity: Number(it.quantity) || 0,
          unitPrice: Number(it.unitPrice) || 0,
          total: (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
          source: it.source ?? null,
        })),
      });
    }

    return {
      ok: true,
      outputText: raw.text,
      outputJson: parsed,
      documentType: 'PRESUPUESTO',
      documentTitle: 'Presupuesto valorado',
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
