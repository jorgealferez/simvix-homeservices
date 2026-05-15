import { PDFDocument } from 'pdf-lib';
import { prisma } from '@/lib/db';
import { PdfBuilder } from './base';
import { renderDocumentPdf, renderBudgetPdf } from './documents';
import { getAyuntamiento } from '@/lib/obras/ayuntamientos';

const DOC_ORDER = [
  'ESCRITO_AYUNTAMIENTO',
  'DECLARACION_RESPONSABLE',
  'AUTORIZACION_PROPIETARIO',
  'MODELO_TASA',
  'INTAKE_BRIEF',
  'NORMATIVA_ANALYSIS',
  'ANTEPROYECTO',
  'MEMORIA_DESCRIPTIVA',
  'MEMORIA_CONSTRUCTIVA',
  'MEDICIONES',
  'PRESUPUESTO',
  'ESTUDIO_SS',
  'GESTION_RESIDUOS',
  'PLANO',
];

/**
 * Genera el paquete final concatenando todos los documentos del proyecto en un
 * único PDF. Las páginas se numeran globalmente y se prepende un índice.
 */
export async function buildSubmissionPackage(projectId: string): Promise<Uint8Array> {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { client: true, documents: true, budgetItems: true },
  });

  const merged = await PDFDocument.create();
  merged.setTitle(`${project.reference} — Paquete completo`);
  merged.setProducer('Simvix Obras');

  const ayto = getAyuntamiento(project.ayuntamientoSlug);

  // Portada
  const cover = await PdfBuilder.create({
    title: 'Expediente de obra',
    subtitle: `${project.reference} — ${project.title}`,
  });
  cover.heading1(ayto.nombre);
  cover.text(`Cliente: ${project.client.fullName}`);
  cover.text(`Emplazamiento: ${[project.addressLine, project.city, project.postalCode].filter(Boolean).join(', ')}`);
  cover.text(`Tipo de obra: ${project.obraType} / Uso: ${project.useType}`);
  cover.text(`Superficie: ${project.surfaceM2 ?? '?'} m²`);
  cover.spacer(10);
  cover.heading2('Documentos incluidos');
  for (const t of DOC_ORDER) {
    if (project.documents.some((d) => d.type === t)) {
      cover.bullet(t);
    }
  }
  if (project.budgetItems.length) cover.bullet('PRESUPUESTO_DETALLADO');

  await mergeBytes(merged, await cover.save());

  // Documentos en orden
  const byType = new Map<string, typeof project.documents[number]>();
  for (const d of project.documents) {
    // Última versión por tipo
    const existing = byType.get(d.type);
    if (!existing || existing.version < d.version) byType.set(d.type, d);
  }

  for (const type of DOC_ORDER) {
    const doc = byType.get(type);
    if (!doc) continue;
    const bytes = await renderDocumentPdf(doc, project);
    await mergeBytes(merged, bytes);
  }

  if (project.budgetItems.length) {
    const bytes = await renderBudgetPdf(project, project.budgetItems);
    await mergeBytes(merged, bytes);
  }

  return merged.save();
}

async function mergeBytes(dest: PDFDocument, bytes: Uint8Array): Promise<void> {
  const src = await PDFDocument.load(bytes);
  const pages = await dest.copyPages(src, src.getPageIndices());
  for (const p of pages) dest.addPage(p);
}
