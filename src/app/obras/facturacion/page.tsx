import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getAuthContext } from '@/lib/auth/session';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { InvoiceCreateForm } from '@/components/obras/InvoiceCreateForm';

export const dynamic = 'force-dynamic';

const TONE_BY_STATUS: Record<string, 'neutral' | 'info' | 'success' | 'warn' | 'danger'> = {
  DRAFT: 'neutral',
  ISSUED: 'info',
  PAID: 'success',
  OVERDUE: 'warn',
  CANCELLED: 'danger',
};

export default async function FacturacionPage() {
  const ctx = await getAuthContext();
  const invoices = await prisma.invoice.findMany({
    where: ctx?.isPlatformAdmin ? {} : { orgId: ctx?.activeOrgId ?? '__none__' },
    include: { lines: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const clients = await prisma.client.findMany({
    where: { orgId: ctx?.activeOrgId, deletedAt: null },
    orderBy: { fullName: 'asc' },
    take: 200,
  });

  const totalIssued = invoices
    .filter((i) => i.status === 'ISSUED')
    .reduce((acc, i) => acc + i.total, 0);
  const totalPaid = invoices
    .filter((i) => i.status === 'PAID')
    .reduce((acc, i) => acc + i.total, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Facturación</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Minutas a clientes. Numeración F-AAAA-NNNN por organización y año.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <Card className="!p-3">
          <div className="text-xs uppercase text-slate-500">Total facturas</div>
          <div className="text-xl font-bold">{invoices.length}</div>
        </Card>
        <Card className="!p-3">
          <div className="text-xs uppercase text-slate-500">Importe emitido</div>
          <div className="text-xl font-bold">{totalIssued.toFixed(2)} €</div>
        </Card>
        <Card className="!p-3">
          <div className="text-xs uppercase text-slate-500">Importe cobrado</div>
          <div className="text-xl font-bold text-emerald-700">{totalPaid.toFixed(2)} €</div>
        </Card>
      </div>

      <Card>
        <CardTitle>Listado</CardTitle>
        {invoices.length === 0 ? (
          <EmptyState title="Sin facturas" description="Crea la primera con el formulario de abajo." />
        ) : (
          <table className="w-full text-sm mt-3">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left py-1">Número</th>
                <th className="text-left">Estado</th>
                <th className="text-left">Emitida</th>
                <th className="text-left">Vence</th>
                <th className="text-right">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1 font-mono">{inv.number}</td>
                  <td>
                    <Badge tone={TONE_BY_STATUS[inv.status] ?? 'neutral'}>{inv.status}</Badge>
                  </td>
                  <td className="text-xs">
                    {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('es-ES') : '—'}
                  </td>
                  <td className="text-xs">
                    {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('es-ES') : '—'}
                  </td>
                  <td className="text-right font-mono">{inv.total.toFixed(2)} €</td>
                  <td className="text-right">
                    <Link
                      href={`/api/invoices/${inv.id}/pdf`}
                      className="text-xs underline hover:text-emerald-600"
                    >
                      PDF
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <CardTitle>Nueva factura</CardTitle>
        <InvoiceCreateForm
          clients={clients.map((c) => ({ id: c.id, label: c.fullName + (c.email ? ` <${c.email}>` : '') }))}
        />
      </Card>
    </div>
  );
}
