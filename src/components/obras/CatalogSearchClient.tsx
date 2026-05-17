'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface SearchHit {
  score: number;
  item: {
    id: string;
    code: string;
    description: string;
    unit: string;
    unitPrice: number;
    chapter: string;
    catalog: { slug: string; name: string; source: string };
  };
}

export function CatalogSearchClient() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/catalogs/search?q=${encodeURIComponent(q)}&limit=15`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      const body = await res.json();
      setResults(body.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={search} className="flex gap-2">
        <Input
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ej. tabique cerámico, alicatado, punto de luz…"
        />
        <Button type="submit" loading={loading} size="md">
          Buscar
        </Button>
      </form>
      {error && <div className="text-xs text-red-600">{error}</div>}
      {results.length > 0 && (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
          {results.map((r) => (
            <li key={r.item.id} className="py-2 flex items-center justify-between gap-3">
              <div>
                <div className="font-mono text-xs text-slate-500">{r.item.code}</div>
                <div>{r.item.description}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {r.item.chapter} · {r.item.catalog.name}
                </div>
              </div>
              <div className="text-right">
                <Badge tone="info">score {r.score}</Badge>
                <div className="text-sm mt-1">
                  <strong>{r.item.unitPrice.toFixed(2)} €</strong>/{r.item.unit}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
