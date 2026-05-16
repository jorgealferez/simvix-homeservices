import { prisma } from '@/lib/db';
import { storage, makeDrawingKey } from '@/lib/storage';
import { callAi } from '@/lib/ai/client';

/**
 * P09 — Generación de planos vectoriales (SVG) por LLM.
 *
 * Claude recibe una descripción del espacio + restricciones y devuelve un
 * documento SVG con dimensiones, leyenda y trazado. El SVG se guarda como
 * Drawing del proyecto.
 *
 * Limitaciones honestas: el LLM no es un CAD — esto sirve como esquema rápido
 * o como input para que el delineante humano refine. Para precisión real,
 * P26 (BIM IFC) o herramientas dedicadas.
 */

interface GenerateOptions {
  projectId: string;
  prompt: string;
  scale?: string;
  category: string;
  code: string;
  title: string;
}

const SYSTEM = `Eres un dibujante CAD. Devuelve SOLO un documento SVG válido (sin
explicaciones ni markdown), de máximo 1200x900, con:
- viewBox apropiado, fondo blanco, líneas negras
- texto en <text> con font-family="Helvetica,Arial,sans-serif" font-size="14"
- cotas en mm/cm con líneas auxiliares
- leyenda en la esquina inferior derecha
No incluyas <script> ni atributos on*.`;

export async function generateSvgDrawing(opts: GenerateOptions) {
  const result = await callAi({
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Dibuja un SVG según esta descripción:\n${opts.prompt}\n\nEscala: ${opts.scale ?? '1:50'}.\nEspacio aprox: A4 apaisado.`,
      },
    ],
    effort: 'high',
    maxTokens: 8000,
  });

  let svg = result.text.trim();
  // Si el modelo envolvió en fenced code block, lo quitamos.
  const fence = svg.match(/```(?:svg|xml)?\s*([\s\S]*?)```/);
  if (fence) svg = fence[1].trim();
  if (!svg.startsWith('<svg')) {
    // Modo mock o fallo de formato: SVG plantilla con metadatos, para que
    // el flujo no se rompa en dev/CI sin ANTHROPIC_API_KEY.
    svg = mockSvg(opts);
  }
  // Sanitización mínima — prohibimos scripts y handlers inline.
  svg = svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+="[^"]*"/gi, '')
    .replace(/\son[a-z]+='[^']*'/gi, '');

  const buf = Buffer.from(svg, 'utf8');
  const key = makeDrawingKey(opts.projectId, `${opts.code}.svg`);
  const stored = await storage.put(key, buf, { mimeType: 'image/svg+xml' });

  const drawing = await prisma.drawing.create({
    data: {
      projectId: opts.projectId,
      code: opts.code,
      title: opts.title,
      scale: opts.scale ?? '1:50',
      category: opts.category,
      filePath: stored.key,
      originalName: `${opts.code}.svg`,
      mimeType: 'image/svg+xml',
      sizeBytes: stored.sizeBytes,
      sha256: stored.sha256,
      aiAnnotationsJson: JSON.stringify({
        generatedBy: 'llm',
        model: result.model,
        prompt: opts.prompt.slice(0, 500),
      }),
    },
  });

  await prisma.projectEvent.create({
    data: {
      projectId: opts.projectId,
      type: 'DRAWING_GENERATED_LLM',
      actor: 'system',
      payload: JSON.stringify({ drawingId: drawing.id, model: result.model, costUsd: result.costUsd }),
    },
  });

  return { drawing, usage: { model: result.model, costUsd: result.costUsd } };
}

function mockSvg(opts: GenerateOptions): string {
  const safe = (s: string) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1200" height="900">
  <rect width="1200" height="900" fill="white"/>
  <rect x="80" y="80" width="1040" height="740" fill="none" stroke="black" stroke-width="2"/>
  <text x="100" y="120" font-family="Helvetica,Arial,sans-serif" font-size="22" font-weight="bold">${safe(opts.title)}</text>
  <text x="100" y="150" font-family="Helvetica,Arial,sans-serif" font-size="14">Código: ${safe(opts.code)} · Escala ${safe(opts.scale ?? '1:50')}</text>
  <text x="100" y="180" font-family="Helvetica,Arial,sans-serif" font-size="14">Categoría: ${safe(opts.category)}</text>
  <text x="100" y="250" font-family="Helvetica,Arial,sans-serif" font-size="12" fill="#555">[Plantilla generada en modo mock — sin ANTHROPIC_API_KEY]</text>
  <text x="100" y="280" font-family="Helvetica,Arial,sans-serif" font-size="12" fill="#555">Prompt: ${safe(opts.prompt.slice(0, 120))}</text>
  <text x="950" y="860" font-family="Helvetica,Arial,sans-serif" font-size="10" fill="#888">Simvix Obras</text>
</svg>`;
}
