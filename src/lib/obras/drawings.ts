import { prisma } from '@/lib/db';
import { storage } from '@/lib/storage';
import { callAi, tryExtractJson, type MultimodalAttachment } from '@/lib/ai/client';
import type { Drawing, Project } from '@prisma/client';

/**
 * P06 — Análisis IA de planos.
 *
 * Recibe el plano subido (PDF o imagen) y lo envía al modelo en multimodal
 * para extraer:
 *   - GENERAL: descripción global, escala detectada, leyenda, estancias.
 *   - SUPERFICIES: tabla útil/construida por estancia.
 *   - DB_SUA: itinerario accesible, dimensiones mínimas, observaciones.
 *   - DB_SI: ocupación, recorridos de evacuación, sectorización.
 *   - DISCREPANCIAS: compara con otro plano (típico: estado actual vs reformado).
 *
 * El resultado se persiste en DrawingAnalysis con tokens, coste y duración.
 */

export type AnalysisKind = 'GENERAL' | 'SUPERFICIES' | 'DB_SUA' | 'DB_SI' | 'DISCREPANCIAS';

const SUPPORTED_IMAGE_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

const PROMPTS: Record<AnalysisKind, { system: string; user: string }> = {
  GENERAL: {
    system: `Eres un arquitecto técnico revisando un plano. Devuelve un JSON con:
{
  "scaleDetected": "1:50 | 1:100 | desconocida",
  "drawingType": "planta | alzado | sección | detalle | situación | otros",
  "summary": "1 párrafo describiendo el contenido del plano",
  "rooms": [{"name": "...", "approximateUseM2": null}],
  "legendItems": ["..."],
  "observations": ["..."],
  "confidence": "alta | media | baja"
}
Si no puedes detectar algo, devuelve null en ese campo. No inventes cotas que no veas.`,
    user: 'Analiza este plano y devuélveme el JSON con la estructura indicada.',
  },
  SUPERFICIES: {
    system: `Eres un arquitecto medidor. Devuelve estrictamente un JSON con:
{
  "rooms": [{"name": "...", "usefulM2": 0, "builtM2": 0, "confidence": "alta|media|baja"}],
  "totalUsefulM2": 0,
  "totalBuiltM2": 0,
  "notes": ["..."]
}
Si las cotas no son legibles, deja los m² en null y márcalo en notes.`,
    user: 'Extrae las superficies útiles y construidas por estancia, sin inventar valores.',
  },
  DB_SUA: {
    system: `Eres un técnico en accesibilidad (CTE DB-SUA). Devuelve JSON:
{
  "accessibleItinerary": {"present": true|false, "notes": "..."},
  "minDimensions": [{"item": "puerta entrada", "valueCm": 80, "complies": true|false}],
  "stairs": [{"width_cm": null, "tread_cm": null, "riser_cm": null, "complies": true|false}],
  "issues": [{"severity": "alta|media|baja", "description": "..."}],
  "summary": "..."
}`,
    user: 'Evalúa el cumplimiento de DB-SUA: itinerarios accesibles, dimensiones mínimas, escaleras, riesgos.',
  },
  DB_SI: {
    system: `Eres un técnico en seguridad en caso de incendio (CTE DB-SI). Devuelve JSON:
{
  "occupancy": {"estimatedPeople": null, "method": "..."},
  "evacuation": {"maxDistance_m": null, "exits": [{"location": "...", "width_cm": null}]},
  "sectorization": [{"name": "...", "approxArea_m2": null}],
  "issues": [{"severity": "alta|media|baja", "description": "..."}],
  "summary": "..."
}`,
    user: 'Evalúa el cumplimiento de DB-SI: ocupación, recorridos de evacuación, sectorización.',
  },
  DISCREPANCIAS: {
    system: `Comparas dos planos del mismo edificio (estado actual vs estado reformado u otro). Devuelve JSON:
{
  "differences": [{"area": "...", "change": "demolición|nueva|reforma|sin cambio", "description": "..."}],
  "consistency": "consistente|inconsistencias menores|inconsistencias graves",
  "missingElements": ["..."],
  "summary": "..."
}`,
    user: 'Identifica las diferencias entre ambos planos y resume el alcance de los cambios.',
  },
};

interface AnalyzeOptions {
  kind: AnalysisKind;
  /** Para DISCREPANCIAS: comparar con este otro plano del mismo proyecto. */
  comparedWithDrawingId?: string;
}

export async function analyzeDrawing(drawingId: string, opts: AnalyzeOptions) {
  const drawing = await prisma.drawing.findUnique({
    where: { id: drawingId },
    include: { project: true },
  });
  if (!drawing) throw new Error('Plano no encontrado');
  if (!drawing.filePath) throw new Error('El plano no tiene fichero asociado');

  const prompt = PROMPTS[opts.kind];
  const t0 = Date.now();
  let status: 'SUCCEEDED' | 'FAILED' = 'SUCCEEDED';
  let errorMsg: string | null = null;
  let parsed: unknown = null;
  let rawText = '';
  let usage = { model: '', inputTokens: 0, outputTokens: 0, costUsd: 0 };

  try {
    const attachments: MultimodalAttachment[] = [
      await buildAttachment(drawing, 'Plano objetivo'),
    ];

    if (opts.kind === 'DISCREPANCIAS') {
      if (!opts.comparedWithDrawingId) {
        throw new Error('DISCREPANCIAS requiere comparedWithDrawingId');
      }
      const other = await prisma.drawing.findUnique({
        where: { id: opts.comparedWithDrawingId },
      });
      if (!other || !other.filePath || other.projectId !== drawing.projectId) {
        throw new Error('Plano de comparación inválido');
      }
      attachments.push(await buildAttachment(other, 'Plano de referencia'));
    }

    const result = await callAi({
      system: prompt.system,
      messages: [
        {
          role: 'user',
          content: `${prompt.user}\n\nContexto proyecto: ${describeProject(drawing.project)}.`,
        },
      ],
      attachments,
      maxTokens: 3000,
      effort: 'high',
    });
    rawText = result.text;
    parsed = tryExtractJson(rawText) ?? { raw: rawText };
    usage = {
      model: result.model,
      inputTokens: result.inputTokens + result.cacheReadTokens + result.cacheCreationTokens,
      outputTokens: result.outputTokens,
      costUsd: result.costUsd,
    };
  } catch (err) {
    status = 'FAILED';
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  const persisted = await prisma.drawingAnalysis.create({
    data: {
      drawingId: drawing.id,
      kind: opts.kind,
      resultJson: JSON.stringify(parsed ?? { error: errorMsg }),
      model: usage.model || null,
      inputTokens: usage.inputTokens || null,
      outputTokens: usage.outputTokens || null,
      costUsd: usage.costUsd || null,
      durationMs: Date.now() - t0,
      status,
      error: errorMsg,
      comparedWithDrawingId: opts.comparedWithDrawingId ?? null,
    },
  });

  await prisma.projectEvent.create({
    data: {
      projectId: drawing.projectId,
      type: 'DRAWING_ANALYZED',
      actor: 'system',
      payload: JSON.stringify({
        drawingId: drawing.id,
        analysisId: persisted.id,
        kind: opts.kind,
        status,
        costUsd: usage.costUsd,
      }),
    },
  });

  return persisted;
}

async function buildAttachment(drawing: Drawing, caption: string): Promise<MultimodalAttachment> {
  if (!drawing.filePath) throw new Error('plano sin filePath');
  const bytes = await storage.get(drawing.filePath);
  const data = bytes.toString('base64');

  const mime = drawing.mimeType ?? 'application/octet-stream';
  if (mime === 'application/pdf') {
    return { type: 'document', mediaType: mime, data, caption };
  }
  if (SUPPORTED_IMAGE_MIME.has(mime)) {
    return { type: 'image', mediaType: mime, data, caption };
  }
  throw new Error(`Tipo no soportado por visión multimodal: ${mime}`);
}

function describeProject(project: Project): string {
  return [
    project.title,
    project.obraType,
    project.useType,
    project.surfaceM2 ? `${project.surfaceM2} m²` : null,
    project.city,
  ]
    .filter(Boolean)
    .join(' / ');
}
