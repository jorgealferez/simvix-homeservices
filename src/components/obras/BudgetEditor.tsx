'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BudgetItem } from '@prisma/client';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface Props {
  projectId: string;
  items: BudgetItem[];
}

interface DraftLine {
  chapter: string;
  code: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
}

const EMPTY_LINE: DraftLine = {
  chapter: '',
  code: '',
  description: '',
  unit: 'ud',
  quantity: '1',
  unitPrice: '0',
};

export function BudgetEditor({ projectId, items }: Props) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const byChapter = new Map<string, BudgetItem[]>();
  for (const it of items) {
    if (!byChapter.has(it.chapter)) byChapter.set(it.chapter, []);
    byChapter.get(it.chapter)!.push(it);
  }
  const pem = items.reduce((acc, b) => acc + b.total, 0);
  const gg = pem * 0.13;
  const bi = pem * 0.06;
  const pec = pem + gg + bi;
  const iva = pec * 0.21;

  async function saveEdit(id: string, form: HTMLFormElement) {
    const fd = new FormData(form);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/obras/${projectId}/budget/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chapter: String(fd.get('chapter')),
          code: String(fd.get('code')),
          description: String(fd.get('description')),
          unit: String(fd.get('unit')),
          quantity: Number(fd.get('quantity')),
          unitPrice: Number(fd.get('unitPrice')),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      setEditId(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('¿Eliminar esta partida?')) return;
    setBusy(true);
    try {
      await fetch(`/api/obras/${projectId}/budget/${id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function addItem(form: HTMLFormElement) {
    const fd = new FormData(form);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/obras/${projectId}/budget`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chapter: String(fd.get('chapter')),
          code: String(fd.get('code')),
          description: String(fd.get('description')),
          unit: String(fd.get('unit')),
          quantity: Number(fd.get('quantity')),
          unitPrice: Number(fd.get('unitPrice')),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      form.reset();
      setAdding(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <CardTitle>Presupuesto</CardTitle>
        <div className="flex items-center gap-2 text-xs">
          <Badge tone="info">{items.length} partidas</Badge>
          <Button size="sm" variant="ghost" onClick={() => setAdding((p) => !p)}>
            {adding ? '× cancelar' : '+ añadir partida'}
          </Button>
        </div>
      </div>

      {error && <div className="text-xs text-red-600 mt-2">{error}</div>}

      {adding && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addItem(e.currentTarget);
          }}
          className="grid grid-cols-12 gap-2 mt-3 items-end border border-emerald-200 dark:border-emerald-800 rounded-md p-2"
        >
          <div className="col-span-3">
            <Input name="chapter" label="Capítulo" defaultValue={EMPTY_LINE.chapter} required />
          </div>
          <div className="col-span-2">
            <Input name="code" label="Código" required />
          </div>
          <div className="col-span-5">
            <Input name="description" label="Descripción" required />
          </div>
          <div className="col-span-1">
            <Input name="unit" label="Ud." defaultValue={EMPTY_LINE.unit} required />
          </div>
          <div className="col-span-1">
            <Input name="quantity" type="number" step="0.01" label="Cant." defaultValue="1" required />
          </div>
          <div className="col-span-2">
            <Input name="unitPrice" type="number" step="0.01" label="P. unit. €" defaultValue="0" required />
          </div>
          <div className="col-span-10 flex justify-end">
            <Button type="submit" size="sm" loading={busy}>
              Añadir
            </Button>
          </div>
        </form>
      )}

      {items.length === 0 && !adding && (
        <p className="text-xs text-slate-500 mt-3">
          Sin partidas. Ejecuta el agente de presupuesto o añade manualmente.
        </p>
      )}

      <div className="mt-3 space-y-4 text-sm">
        {Array.from(byChapter.entries()).map(([chapter, list]) => {
          const sub = list.reduce((a, b) => a + b.total, 0);
          return (
            <div key={chapter}>
              <h3 className="font-medium text-slate-800 dark:text-slate-200">{chapter}</h3>
              <table className="w-full text-xs mt-1">
                <thead className="text-slate-500">
                  <tr>
                    <th className="text-left">Código</th>
                    <th className="text-left">Descripción</th>
                    <th className="text-right">Cant.</th>
                    <th className="text-right">Ud.</th>
                    <th className="text-right">P. unit.</th>
                    <th className="text-right">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((it) =>
                    editId === it.id ? (
                      <tr key={it.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td colSpan={7} className="py-1">
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              saveEdit(it.id, e.currentTarget);
                            }}
                            className="grid grid-cols-12 gap-2 items-end"
                          >
                            <div className="col-span-3">
                              <Input name="chapter" defaultValue={it.chapter} required />
                            </div>
                            <div className="col-span-2">
                              <Input name="code" defaultValue={it.code} required />
                            </div>
                            <div className="col-span-3">
                              <Input name="description" defaultValue={it.description} required />
                            </div>
                            <div className="col-span-1">
                              <Input name="unit" defaultValue={it.unit} required />
                            </div>
                            <div className="col-span-1">
                              <Input
                                name="quantity"
                                type="number"
                                step="0.01"
                                defaultValue={it.quantity}
                                required
                              />
                            </div>
                            <div className="col-span-1">
                              <Input
                                name="unitPrice"
                                type="number"
                                step="0.01"
                                defaultValue={it.unitPrice}
                                required
                              />
                            </div>
                            <div className="col-span-1 flex gap-1">
                              <Button type="submit" size="sm" loading={busy}>
                                ✓
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditId(null)}
                              >
                                ×
                              </Button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : (
                      <tr key={it.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-1 font-mono">{it.code}</td>
                        <td>{it.description}</td>
                        <td className="text-right">{it.quantity}</td>
                        <td className="text-right">{it.unit}</td>
                        <td className="text-right">{it.unitPrice.toFixed(2)} €</td>
                        <td className="text-right">{it.total.toFixed(2)} €</td>
                        <td className="text-right space-x-2 text-xs">
                          <button
                            className="underline text-emerald-700 dark:text-emerald-400"
                            onClick={() => setEditId(it.id)}
                          >
                            editar
                          </button>
                          <button
                            className="underline text-red-600"
                            onClick={() => deleteItem(it.id)}
                          >
                            borrar
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                  <tr className="border-t border-slate-200 dark:border-slate-700 font-semibold">
                    <td colSpan={5} className="text-right py-1">
                      Subtotal capítulo
                    </td>
                    <td className="text-right">{sub.toFixed(2)} €</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {items.length > 0 && (
        <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-3 text-sm grid grid-cols-2 gap-1">
          <div>PEM</div>
          <div className="text-right font-mono">{pem.toFixed(2)} €</div>
          <div>+ GG (13%)</div>
          <div className="text-right font-mono">{gg.toFixed(2)} €</div>
          <div>+ BI (6%)</div>
          <div className="text-right font-mono">{bi.toFixed(2)} €</div>
          <div className="font-semibold">PEC</div>
          <div className="text-right font-mono font-semibold">{pec.toFixed(2)} €</div>
          <div>+ IVA (21%)</div>
          <div className="text-right font-mono">{iva.toFixed(2)} €</div>
          <div className="font-bold">TOTAL</div>
          <div className="text-right font-mono font-bold">{(pec + iva).toFixed(2)} €</div>
        </div>
      )}
    </Card>
  );
}
