'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface Inspection {
  id: string;
  createdAt: string;
  inspectorName: string;
  status: string;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  analysisJson: string | null;
  costUsd: number | null;
}

interface Props {
  projectId: string;
  inspections: Inspection[];
}

export function InspectionsPanel({ projectId, inspections }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/obras/${projectId}/inspections`, {
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

  return (
    <Card>
      <CardTitle>Inspecciones en obra</CardTitle>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Sube fotos del estado de la obra (con geolocalización opcional) y la
        IA detecta no conformidades. El criterio del técnico humano prevalece.
      </p>

      <form
        onSubmit={onUpload}
        className="mt-3 space-y-2 border-b border-slate-100 dark:border-slate-800 pb-3"
      >
        <Input name="photo" type="file" accept="image/png,image/jpeg,image/webp" label="Foto *" required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input name="inspectorName" label="Inspector" placeholder="Tu nombre o rol" />
          <Textarea name="notes" label="Notas del inspector" rows={2} />
        </div>
        {error && <div className="text-xs text-red-600">{error}</div>}
        <div className="flex justify-end">
          <Button type="submit" size="sm" loading={submitting}>
            Subir y analizar con IA
          </Button>
        </div>
      </form>

      <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 text-sm">
        {inspections.length === 0 && (
          <li className="py-2 text-xs text-slate-500">Sin inspecciones todavía.</li>
        )}
        {inspections.map((i) => {
          const parsed = i.analysisJson ? safeJson(i.analysisJson) : null;
          return (
            <li key={i.id} className="py-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{i.inspectorName}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(i.createdAt).toLocaleString('es-ES')}
                    {i.latitude && i.longitude && (
                      <span> · {i.latitude.toFixed(4)}, {i.longitude.toFixed(4)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    tone={
                      i.status === 'ANALYZED' ? 'success' : i.status === 'FAILED' ? 'danger' : 'info'
                    }
                  >
                    {i.status}
                  </Badge>
                  {i.costUsd != null && (
                    <span className="text-xs text-slate-500">${i.costUsd.toFixed(4)}</span>
                  )}
                  <button
                    className="text-xs underline"
                    onClick={() => setOpenId((p) => (p === i.id ? null : i.id))}
                  >
                    {openId === i.id ? 'ocultar' : 'detalle'}
                  </button>
                </div>
              </div>
              {openId === i.id && parsed !== null && (
                <pre className="mt-2 bg-slate-50 dark:bg-slate-800 text-xs p-2 rounded font-mono max-h-72 overflow-auto">
                  {JSON.stringify(parsed, null, 2)}
                </pre>
              )}
              {i.notes && <p className="text-xs text-slate-600 mt-1">{i.notes}</p>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return { raw: s };
  }
}
