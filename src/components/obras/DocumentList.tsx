'use client';

import { useState } from 'react';
import type { Document } from '@prisma/client';

interface Props {
  documents: Document[];
}

export function DocumentList({ documents }: Props) {
  const [open, setOpen] = useState<string | null>(documents[0]?.id ?? null);

  // Dejar sólo la última versión por tipo
  const byType = new Map<string, Document>();
  for (const d of documents) {
    const cur = byType.get(d.type);
    if (!cur || cur.version < d.version) byType.set(d.type, d);
  }
  const list = Array.from(byType.values()).sort((a, b) => a.type.localeCompare(b.type));

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <h2 className="font-semibold text-slate-900 mb-3">Documentos generados</h2>
      {list.length === 0 ? (
        <p className="text-sm text-slate-500">
          Todavía no se han generado documentos. Ejecuta una fase para producirlos.
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((d) => {
            const expanded = open === d.id;
            return (
              <li key={d.id} className="border border-slate-200 rounded-md">
                <button
                  onClick={() => setOpen(expanded ? null : d.id)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 text-left"
                >
                  <span className="text-sm font-medium">
                    {d.title}{' '}
                    <span className="text-xs text-slate-500">
                      ({d.type} · v{d.version}
                      {d.generatedByAi ? ' · IA' : ''})
                    </span>
                  </span>
                  <span className="text-xs text-slate-400">{expanded ? '▲' : '▼'}</span>
                </button>
                {expanded && (
                  <div className="p-3 border-t border-slate-200 prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-xs font-mono text-slate-800 bg-slate-50 p-3 rounded-md max-h-96 overflow-auto">
                      {d.content}
                    </pre>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
