import { prisma } from '@/lib/db';
import { PdfBuilder } from '@/lib/pdf/base';

/**
 * P23 — Facturación.
 *
 * Numeración: F-AAAA-NNNN secuencial por organización y año.
 * Cálculos: subtotal = sum(lines), vatTotal, irpfTotal, total = subtotal + vat - irpf.
 */

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateInvoiceInput {
  orgId: string;
  clientId: string;
  projectId?: string;
  lines: InvoiceLineInput[];
  vatRate?: number;
  irpfRate?: number;
  notes?: string;
  dueInDays?: number;
}

async function nextInvoiceNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count({
    where: { orgId, createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `F-${year}-${String(count + 1).padStart(4, '0')}`;
}

export async function createInvoice(input: CreateInvoiceInput) {
  const vatRate = input.vatRate ?? 21;
  const irpfRate = input.irpfRate ?? 0;
  const subtotal = input.lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0);
  const vatTotal = subtotal * (vatRate / 100);
  const irpfTotal = subtotal * (irpfRate / 100);
  const total = subtotal + vatTotal - irpfTotal;
  const number = await nextInvoiceNumber(input.orgId);

  return prisma.invoice.create({
    data: {
      orgId: input.orgId,
      clientId: input.clientId,
      projectId: input.projectId,
      number,
      status: 'DRAFT',
      subtotal,
      vatRate,
      vatTotal,
      irpfRate,
      irpfTotal,
      total,
      notes: input.notes,
      dueDate: input.dueInDays ? new Date(Date.now() + input.dueInDays * 86400 * 1000) : null,
      lines: {
        create: input.lines.map((l, i) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          total: l.quantity * l.unitPrice,
          ordinal: i,
        })),
      },
    },
    include: { lines: true },
  });
}

export async function markInvoiceIssued(id: string) {
  return prisma.invoice.update({
    where: { id },
    data: { status: 'ISSUED', issueDate: new Date() },
  });
}

export async function markInvoicePaid(id: string, paymentExternalId?: string, paymentProvider?: string) {
  return prisma.invoice.update({
    where: { id },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      paymentExternalId,
      paymentProvider,
    },
  });
}

export async function renderInvoicePdf(invoiceId: string): Promise<Uint8Array> {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { lines: { orderBy: { ordinal: 'asc' } } },
  });
  if (!inv) throw new Error('Factura no encontrada');
  const client = await prisma.client.findUnique({ where: { id: inv.clientId } });

  const b = await PdfBuilder.create({
    title: `Factura ${inv.number}`,
    subtitle:
      (inv.issueDate ? `Emitida ${inv.issueDate.toLocaleDateString('es-ES')}` : 'BORRADOR') +
      (inv.dueDate ? ` · Vencimiento ${inv.dueDate.toLocaleDateString('es-ES')}` : ''),
  });

  b.heading2('Emisor');
  b.text(process.env.OBRAS_FIRMA_NOMBRE ?? 'Estudio (configurar OBRAS_FIRMA_*)');
  if (process.env.OBRAS_FIRMA_CIF) b.text(`CIF: ${process.env.OBRAS_FIRMA_CIF}`);
  if (process.env.OBRAS_FIRMA_DIRECCION) b.text(process.env.OBRAS_FIRMA_DIRECCION);
  b.spacer(8);

  b.heading2('Cliente');
  if (client) {
    b.text(client.fullName);
    if (client.email) b.text(client.email);
  } else {
    b.text(`(id: ${inv.clientId})`);
  }
  b.spacer(8);

  b.heading2('Conceptos');
  for (const l of inv.lines) {
    b.text(
      `${l.description}  ·  ${l.quantity} × ${l.unitPrice.toFixed(2)} €  =  ${l.total.toFixed(2)} €`,
    );
  }
  b.spacer(6);
  b.hr();
  b.text(`Subtotal: ${inv.subtotal.toFixed(2)} €`);
  b.text(`IVA (${inv.vatRate}%): ${inv.vatTotal.toFixed(2)} €`);
  if (inv.irpfTotal) b.text(`Retención IRPF (${inv.irpfRate}%): -${inv.irpfTotal.toFixed(2)} €`);
  b.text(`TOTAL: ${inv.total.toFixed(2)} €`, { bold: true });

  if (inv.notes) {
    b.spacer(8);
    b.heading2('Observaciones');
    b.markdown(inv.notes);
  }
  return b.save();
}
