'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface Hit {
  docSlug: string;
  docTitle: string;
  docKind: string;
  section: string | null;
  content: string;
  score: number;
}

const KINDS = [
  { value: '', label: 'Todos' },
  { value: 'CTE_DB', label: 'CTE DB' },
  { value: 'PGOU', label: 'PGOU' },
  { value: 'ORDENANZA', label: 'Ordenanza' },
  { value: 'RD', label: 'Real Decreto' },
  { value: 'AUTONOMICO', label: 'Autonómico' },
];

export function KnowledgeSearchClient() {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [results, setResults] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const url = `/api/knowledge?q=${encodeURIComponent(q)}${kind ? `&kind=${kind}` : ''}&limit=10`;
    const res = await fetch(url);
    if (res.ok) {
      const body = await res.json();
      setResults(body.results ?? []);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <form onSubmit={search} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
        <div className="sm:col-span-7">
          <Input
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ej. ancho de evacuación, transmitancia, accesibilidad…"
          />
        </div>
        <div className="sm:col-span-3">
          <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} options={KINDS} />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" loading={loading} size="md" className="w-full">
            Buscar
          </Button>
        </div>
      </form>

      {results.length > 0 && (
        <ul className="space-y-2 mt-3">
          {results.map((r, i) => (
            <li
              key={i}
              className="text-sm border border-slate-200 dark:border-slate-700 rounded-md p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium">{r.docTitle}</div>
                <Badge tone="info">score {r.score}</Badge>
              </div>
              {r.section && (
                <div className="text-xs text-slate-500 mb-1">{r.section}</div>
              )}
              <p className="whitespace-pre-wrap text-xs font-mono text-slate-700 dark:text-slate-300">
                {r.content.slice(0, 600)}
                {r.content.length > 600 && '…'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
