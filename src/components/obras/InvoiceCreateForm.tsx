'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

interface Line {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Props {
  clients: { id: string; label: string }[];
}

export function InvoiceCreateForm({ clients }: Props) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);
  }
  function removeLine(i: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }
  const subtotal = lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientId: String(fd.get('clientId')),
          vatRate: Number(fd.get('vatRate') ?? 21),
          irpfRate: Number(fd.get('irpfRate') ?? 0),
          dueInDays: fd.get('dueInDays') ? Number(fd.get('dueInDays')) : undefined,
          notes: (fd.get('notes') as string) || undefined,
          lines: lines.filter((l) => l.description.trim() && l.quantity > 0),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!clients.length) {
    return (
      <p className="text-xs text-slate-500">
        Aún no tienes clientes en la organización activa. Crea un proyecto para registrar el primero.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 mt-2">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <Select
          name="clientId"
          label="Cliente *"
          options={clients.map((c) => ({ value: c.id, label: c.label }))}
          required
        />
        <Input name="vatRate" type="number" step="0.01" label="IVA %" defaultValue={21} />
        <Input name="irpfRate" type="number" step="0.01" label="IRPF %" defaultValue={0} />
        <Input name="dueInDays" type="number" label="Vence en (días)" defaultValue={30} />
      </div>

      <div className="space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-6">
              <Input
                value={l.description}
                onChange={(e) => updateLine(i, { description: e.target.value })}
                label={i === 0 ? 'Concepto' : undefined}
                placeholder="Descripción"
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                step="0.01"
                value={l.quantity}
                onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                label={i === 0 ? 'Cant.' : undefined}
              />
            </div>
            <div className="col-span-3">
              <Input
                type="number"
                step="0.01"
                value={l.unitPrice}
                onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })}
                label={i === 0 ? 'P. unit. (€)' : undefined}
              />
            </div>
            <div className="col-span-1">
              <button
                type="button"
                className="text-xs text-red-600 hover:underline"
                onClick={() => removeLine(i)}
              >
                ×
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addLine}
          className="text-xs underline text-emerald-700 dark:text-emerald-400"
        >
          + añadir línea
        </button>
      </div>

      <Input name="notes" label="Observaciones" />

      <div className="text-right text-sm">
        Subtotal: <strong>{subtotal.toFixed(2)} €</strong>
      </div>

      {error && <div className="text-xs text-red-600">{error}</div>}
      <div className="flex justify-end">
        <Button type="submit" loading={submitting} size="sm">
          Crear factura (DRAFT)
        </Button>
      </div>
    </form>
  );
}
