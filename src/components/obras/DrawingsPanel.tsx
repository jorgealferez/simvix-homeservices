'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Drawing } from '@prisma/client';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { DRAWING_CATEGORIES } from '@/lib/obras/enums';

const CATEGORY_OPTIONS = DRAWING_CATEGORIES.map((c) => ({ value: c, label: c.replace(/_/g, ' ') }));

const ANALYSIS_KINDS = [
  { value: 'GENERAL', label: 'General (visión global)' },
  { value: 'SUPERFICIES', label: 'Superficies por estancia' },
  { value: 'DB_SUA', label: 'CTE DB-SUA (accesibilidad)' },
  { value: 'DB_SI', label: 'CTE DB-SI (incendios)' },
];

interface Props {
  projectId: string;
  drawings: Drawing[];
}

export function DrawingsPanel({ projectId, drawings }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [openAnalyses, setOpenAnalyses] = useState<Record<string, AnalysisItem[]>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/obras/${projectId}/drawings`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('¿Eliminar este plano? Se podrá recuperar desde el log de auditoría.')) return;
    const res = await fetch(`/api/obras/${projectId}/drawings/${id}`, { method: 'DELETE' });
    if (res.ok) router.refresh();
  }

  async function onAnalyze(drawingId: string, kind: string) {
    setAnalyzing(`${drawingId}:${kind}`);
    setError(null);
    try {
      const res = await fetch(
        `/api/obras/${projectId}/drawings/${drawingId}/analyze`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ kind }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      await loadAnalyses(drawingId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAnalyzing(null);
    }
  }

  async function loadAnalyses(drawingId: string) {
    const res = await fetch(`/api/obras/${projectId}/drawings/${drawingId}/analyze`);
    if (!res.ok) return;
    const body = await res.json();
    setOpenAnalyses((prev) => ({ ...prev, [drawingId]: body.analyses ?? [] }));
  }

  return (
    <Card>
      <CardTitle>Planos del proyecto</CardTitle>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        Sube PDF, PNG, JPG, SVG, DXF o IFC. Máx. 50 MB por archivo. Los PDF e
        imágenes pueden analizarse con IA (visión multimodal Claude).
      </p>

      {drawings.length === 0 ? (
        <EmptyState title="Sin planos todavía" description="Sube el primero abajo." />
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 mb-4">
          {drawings.map((d) => (
            <li key={d.id} className="py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm">
                  <div className="font-medium">
                    {d.code} · {d.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                    <Badge tone="neutral">{d.category}</Badge>
                    {d.scale && <Badge>esc {d.scale}</Badge>}
                    {d.sizeBytes && (
                      <span>{(d.sizeBytes / 1024).toFixed(1)} KB</span>
                    )}
                    <span>· {d.mimeType ?? '?'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/obras/${projectId}/drawings/${d.id}?download=1`}
                    className="text-xs underline hover:text-emerald-600"
                  >
                    descargar
                  </a>
                  <button
                    onClick={() => loadAnalyses(d.id)}
                    className="text-xs underline hover:text-emerald-600"
                  >
                    análisis
                  </button>
                  <button
                    onClick={() => onDelete(d.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    eliminar
                  </button>
                </div>
              </div>

              {canAnalyze(d) && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {ANALYSIS_KINDS.map((k) => (
                    <button
                      key={k.value}
                      onClick={() => onAnalyze(d.id, k.value)}
                      disabled={analyzing === `${d.id}:${k.value}`}
                      className="text-[11px] px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-700 disabled:opacity-50"
                    >
                      {analyzing === `${d.id}:${k.value}` ? 'analizando…' : `🔎 ${k.label}`}
                    </button>
                  ))}
                </div>
              )}

              {openAnalyses[d.id]?.length ? (
                <div className="mt-2 space-y-1">
                  {openAnalyses[d.id].map((a) => (
                    <details
                      key={a.id}
                      className="text-xs bg-slate-50 dark:bg-slate-800/50 rounded p-2 border border-slate-200 dark:border-slate-700"
                    >
                      <summary className="cursor-pointer">
                        <Badge
                          tone={a.status === 'SUCCEEDED' ? 'success' : 'danger'}
                          className="mr-1"
                        >
                          {a.kind}
                        </Badge>
                        {new Date(a.createdAt).toLocaleString('es-ES')}
                        {a.costUsd != null && (
                          <span className="text-slate-500 ml-2">
                            · ${a.costUsd.toFixed(4)}
                          </span>
                        )}
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] max-h-72 overflow-auto">
                        {prettyJson(a.resultJson)}
                      </pre>
                    </details>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={onSubmit}
        className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input name="code" label="Código *" placeholder="P-01" required />
          <Input name="title" label="Título *" placeholder="Planta baja reformada" required />
          <Input name="scale" label="Escala" placeholder="1:50" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Select name="category" label="Categoría *" options={CATEGORY_OPTIONS} required />
          <Input
            name="file"
            type="file"
            label="Archivo *"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.svg,.dxf,.ifc"
            required
          />
        </div>
        {error && <div className="text-xs text-red-600">{error}</div>}
        <div className="flex justify-end">
          <Button type="submit" loading={submitting} size="sm">
            Subir plano
          </Button>
        </div>
      </form>
    </Card>
  );
}

interface AnalysisItem {
  id: string;
  kind: string;
  status: string;
  costUsd: number | null;
  resultJson: string;
  createdAt: string;
}

function canAnalyze(d: Drawing): boolean {
  if (!d.mimeType) return false;
  return (
    d.mimeType === 'application/pdf' ||
    d.mimeType.startsWith('image/') &&
      ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(d.mimeType)
  );
}

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
