'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Document } from '@prisma/client';

interface Props {
  projectId: string;
  documents: Document[];
}

export function DocumentList({ projectId, documents }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(documents[0]?.id ?? null);
  const [signing, setSigning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const byType = new Map<string, Document>();
  for (const d of documents) {
    const cur = byType.get(d.type);
    if (!cur || cur.version < d.version) byType.set(d.type, d);
  }
  const list = Array.from(byType.values()).sort((a, b) => a.type.localeCompare(b.type));

  async function sign(docId: string) {
    const name = window.prompt('¿Quién firma? (nombre completo)');
    if (!name) return;
    setSigning(docId);
    setError(null);
    try {
      const res = await fetch(`/api/obras/${projectId}/documents/${docId}/sign`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ signerName: name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSigning(null);
    }
  }

  async function rateDoc(docId: string, rating: 'UP' | 'DOWN') {
    setFeedback(`${docId}:${rating}`);
    await fetch(`/api/obras/${projectId}/documents/${docId}/feedback`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rating }),
    });
    setFeedback(null);
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Documentos generados</h2>
      {error && <div className="text-xs text-red-600 mb-2">{error}</div>}
      {list.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Todavía no se han generado documentos. Ejecuta una fase para producirlos.
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((d) => {
            const expanded = open === d.id;
            return (
              <li key={d.id} className="border border-slate-200 dark:border-slate-800 rounded-md">
                <div className="flex items-center justify-between px-3 py-2 gap-2">
                  <button
                    onClick={() => setOpen(expanded ? null : d.id)}
                    className="flex-1 text-left text-sm font-medium hover:underline truncate"
                  >
                    {d.title}{' '}
                    <span className="text-xs text-slate-500 ml-1">
                      ({d.type} · v{d.version}
                      {d.generatedByAi ? ' · IA' : ''})
                    </span>
                  </button>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      title="Útil"
                      onClick={() => rateDoc(d.id, 'UP')}
                      disabled={feedback === `${d.id}:UP`}
                      className="hover:text-emerald-600 disabled:opacity-50"
                    >
                      👍
                    </button>
                    <button
                      title="No útil"
                      onClick={() => rateDoc(d.id, 'DOWN')}
                      disabled={feedback === `${d.id}:DOWN`}
                      className="hover:text-red-600 disabled:opacity-50"
                    >
                      👎
                    </button>
                    <button
                      onClick={() => sign(d.id)}
                      disabled={signing === d.id}
                      className="underline hover:text-emerald-600 disabled:opacity-50"
                    >
                      {signing === d.id ? 'firmando…' : '✍ firmar'}
                    </button>
                    <span className="text-slate-400">{expanded ? '▲' : '▼'}</span>
                  </div>
                </div>
                {expanded && (
                  <div className="p-3 border-t border-slate-200 dark:border-slate-800">
                    <pre className="whitespace-pre-wrap text-xs font-mono text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 p-3 rounded-md max-h-96 overflow-auto">
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
