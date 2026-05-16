import { prisma } from '@/lib/db';
import { storage, makeDrawingKey, mimeFromName } from '@/lib/storage';
import { callAi, tryExtractJson, type MultimodalAttachment } from '@/lib/ai/client';

/**
 * P25 — Inspección IA en obra.
 *
 * El técnico sube una foto desde el móvil (con o sin geolocalización) y
 * opcionalmente notas. La IA analiza la foto y devuelve no conformidades
 * potenciales, recomendaciones y nivel de severidad.
 *
 * El análisis es honesto: el modelo puede equivocarse; el resultado es un
 * apoyo, no sustituye al criterio del técnico. Por eso `status` queda en
 * ANALYZED pero la última palabra es siempre del humano (que firma vía P17).
 */

const SUPPORTED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

export interface CreateInspectionParams {
  projectId: string;
  inspectorId?: string;
  inspectorName: string;
  photo: Buffer;
  photoName: string;
  photoMime?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export async function createInspection(p: CreateInspectionParams) {
  const mime = p.photoMime || mimeFromName(p.photoName) || 'application/octet-stream';
  if (!SUPPORTED_MIME.has(mime)) {
    throw new Error(`MIME no soportado para inspección: ${mime}`);
  }
  const key = makeDrawingKey(p.projectId, p.photoName);
  const stored = await storage.put(key, p.photo, { mimeType: mime });
  return prisma.siteInspection.create({
    data: {
      projectId: p.projectId,
      inspectorId: p.inspectorId,
      inspectorName: p.inspectorName,
      photoPath: stored.key,
      photoMime: mime,
      photoBytes: stored.sizeBytes,
      latitude: p.latitude,
      longitude: p.longitude,
      notes: p.notes,
      status: 'PENDING',
    },
  });
}

export async function analyzeInspection(inspectionId: string) {
  const ins = await prisma.siteInspection.findUnique({ where: { id: inspectionId } });
  if (!ins) throw new Error('Inspección no encontrada');
  if (!ins.photoPath || !ins.photoMime) throw new Error('Inspección sin foto');

  const bytes = await storage.get(ins.photoPath);
  const data = bytes.toString('base64');

  const attachment: MultimodalAttachment = {
    type: 'image',
    mediaType: ins.photoMime,
    data,
    caption: 'Foto de inspección en obra',
  };

  try {
    const r = await callAi({
      system: `Eres un técnico de control de calidad en obra revisando una foto de la ejecución.
Devuelve estrictamente un JSON con:
{
  "summary": "1 frase descriptiva del estado general",
  "nonConformities": [
    {"area": "muros|forjado|instalaciones|seguridad|acabados|otros",
     "severity": "alta|media|baja",
     "description": "qué se ve mal",
     "recommendation": "qué hacer"}
  ],
  "needsFollowup": true|false
}
Si no detectas problemas, devuelve nonConformities vacío.`,
      messages: [
        {
          role: 'user',
          content: `Notas del inspector: ${ins.notes ?? '(ninguna)'}.\nAnaliza la foto.`,
        },
      ],
      attachments: [attachment],
      effort: 'high',
      maxTokens: 2000,
    });
    const parsed = tryExtractJson(r.text) ?? { raw: r.text };
    return prisma.siteInspection.update({
      where: { id: inspectionId },
      data: {
        status: 'ANALYZED',
        analysisJson: JSON.stringify(parsed),
        costUsd: r.costUsd,
      },
    });
  } catch (e) {
    return prisma.siteInspection.update({
      where: { id: inspectionId },
      data: {
        status: 'FAILED',
        analysisJson: JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      },
    });
  }
}
