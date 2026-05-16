import type { BudgetItem } from '@prisma/client';

interface Props {
  items: BudgetItem[];
}

export function BudgetTable({ items }: Props) {
  const byChapter = new Map<string, BudgetItem[]>();
  for (const it of items) {
    if (!byChapter.has(it.chapter)) byChapter.set(it.chapter, []);
    byChapter.get(it.chapter)!.push(it);
  }

  let pem = 0;
  for (const it of items) pem += it.total;
  const gg = pem * 0.13;
  const bi = pem * 0.06;
  const pec = pem + gg + bi;
  const iva = pec * 0.21;
  const total = pec + iva;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <h2 className="font-semibold text-slate-900 mb-3">Presupuesto</h2>
      <div className="space-y-4 text-sm">
        {Array.from(byChapter.entries()).map(([chapter, list]) => {
          const sub = list.reduce((a: number, b: BudgetItem) => a + b.total, 0);
          return (
            <div key={chapter}>
              <h3 className="font-medium text-slate-800">{chapter}</h3>
              <table className="w-full text-xs mt-1">
                <thead className="text-slate-500">
                  <tr>
                    <th className="text-left">Código</th>
                    <th className="text-left">Descripción</th>
                    <th className="text-right">Cant.</th>
                    <th className="text-right">Ud.</th>
                    <th className="text-right">P. unit.</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((it: BudgetItem) => (
                    <tr key={it.id} className="border-t border-slate-100">
                      <td className="py-1 font-mono">{it.code}</td>
                      <td>{it.description}</td>
                      <td className="text-right">{it.quantity}</td>
                      <td className="text-right">{it.unit}</td>
                      <td className="text-right">{it.unitPrice.toFixed(2)} €</td>
                      <td className="text-right">{it.total.toFixed(2)} €</td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-200 font-semibold">
                    <td colSpan={5} className="text-right py-1">
                      Subtotal capítulo
                    </td>
                    <td className="text-right">{sub.toFixed(2)} €</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-slate-200 pt-3 text-sm grid grid-cols-2 gap-1">
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
        <div className="text-right font-mono font-bold">{total.toFixed(2)} €</div>
      </div>
    </div>
  );
}
