import { PdfBuilder } from './base';
import type { Document, Project, Client, BudgetItem } from '@prisma/client';

/**
 * Renderiza un documento Markdown (memoria, normativa, etc.) a PDF.
 */
export async function renderDocumentPdf(doc: Document, project: Project & { client?: Client }): Promise<Uint8Array> {
  const builder = await PdfBuilder.create({
    title: doc.title,
    subtitle: `${project.reference} — ${project.title}`,
  });

  builder.heading2('Datos del proyecto');
  builder.text(`Referencia: ${project.reference}`);
  builder.text(`Título: ${project.title}`);
  builder.text(`Tipo: ${project.obraType} / Uso: ${project.useType}`);
  if (project.addressLine || project.city) {
    builder.text(`Emplazamiento: ${[project.addressLine, project.city, project.postalCode].filter(Boolean).join(', ')}`);
  }
  if (project.client) {
    builder.text(`Cliente: ${project.client.fullName} <${project.client.email}>`);
  }
  builder.hr();
  builder.spacer(4);

  builder.markdown(doc.content);

  return builder.save();
}

/**
 * Renderiza una tabla de presupuesto a PDF agregando totales por capítulo.
 */
export async function renderBudgetPdf(
  project: Project & { client?: Client },
  items: BudgetItem[],
): Promise<Uint8Array> {
  const builder = await PdfBuilder.create({
    title: 'Presupuesto valorado',
    subtitle: `${project.reference} — ${project.title}`,
  });

  const byChapter = new Map<string, BudgetItem[]>();
  for (const it of items) {
    if (!byChapter.has(it.chapter)) byChapter.set(it.chapter, []);
    byChapter.get(it.chapter)!.push(it);
  }

  let pem = 0;
  for (const [chapter, list] of Array.from(byChapter)) {
    builder.heading1(chapter);
    let chapterTotal = 0;
    for (const it of list) {
      builder.text(
        `${it.code}  ${it.description}  ·  ${it.quantity} ${it.unit}  ×  ${it.unitPrice.toFixed(2)} €  =  ${it.total.toFixed(2)} €`,
      );
      chapterTotal += it.total;
    }
    builder.text(`Subtotal ${chapter}: ${chapterTotal.toFixed(2)} €`, { bold: true });
    builder.spacer(6);
    pem += chapterTotal;
  }

  const gg = pem * 0.13;
  const bi = pem * 0.06;
  const pec = pem + gg + bi;
  const iva = pec * 0.21;
  const total = pec + iva;

  builder.hr();
  builder.heading1('Resumen económico');
  builder.text(`Presupuesto de Ejecución Material (PEM): ${pem.toFixed(2)} €`);
  builder.text(`+ Gastos Generales (13%): ${gg.toFixed(2)} €`);
  builder.text(`+ Beneficio Industrial (6%): ${bi.toFixed(2)} €`);
  builder.text(`Presupuesto de Ejecución por Contrata (PEC): ${pec.toFixed(2)} €`, { bold: true });
  builder.text(`+ IVA (21%): ${iva.toFixed(2)} €`);
  builder.text(`TOTAL: ${total.toFixed(2)} €`, { bold: true });

  return builder.save();
}
