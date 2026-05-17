'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface Submission {
  id: string;
  status: string;
  channel: string;
  registroEntrada: string | null;
  fechaPresentacion: string | null;
  fechaResolucion: string | null;
  cheksum: string | null;
}

interface Props {
  projectId: string;
  submissions: Submission[];
}

const TONE: Record<string, 'neutral' | 'info' | 'success' | 'warn' | 'danger'> = {
  PREPARED: 'info',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'danger',
  REQUIRES_FIX: 'warn',
  WITHDRAWN: 'neutral',
};

export function SedePanel({ projectId, submissions }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function action(act: 'prepare' | 'submit' | 'poll', submissionId?: string) {
    setBusy(`${act}:${submissionId ?? ''}`);
    setError(null);
    try {
      const res = await fetch(`/api/obras/${projectId}/sede`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: act, submissionId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const latestPrepared = submissions.find((s) => s.status === 'PREPARED');

  return (
    <Card>
      <CardTitle>Sede electrónica</CardTitle>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Genera el paquete consolidado, lo envía al ayuntamiento y consulta el
        estado. En modo mock las transiciones son automáticas tras 24h.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          loading={busy === 'prepare:'}
          onClick={() => action('prepare')}
        >
          1. Preparar paquete
        </Button>
        <Button
          size="sm"
          variant="primary"
          loading={busy?.startsWith('submit:') ?? false}
          disabled={!latestPrepared}
          onClick={() => latestPrepared && action('submit', latestPrepared.id)}
        >
          2. Enviar al ayuntamiento
        </Button>
        {submissions.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            loading={busy?.startsWith('poll:') ?? false}
            onClick={() => submissions[0] && action('poll', submissions[0].id)}
          >
            3. Consultar estado
          </Button>
        )}
      </div>

      {error && <div className="text-xs text-red-600 mt-2">{error}</div>}

      {submissions.length > 0 && (
        <table className="w-full text-xs mt-4">
          <thead className="text-slate-500">
            <tr>
              <th className="text-left py-1">Estado</th>
              <th className="text-left">Registro</th>
              <th className="text-left">Presentada</th>
              <th className="text-left">Resuelta</th>
              <th className="text-left">SHA-256</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1">
                  <Badge tone={TONE[s.status] ?? 'neutral'}>{s.status}</Badge>
                </td>
                <td className="font-mono">{s.registroEntrada ?? '—'}</td>
                <td>
                  {s.fechaPresentacion
                    ? new Date(s.fechaPresentacion).toLocaleDateString('es-ES')
                    : '—'}
                </td>
                <td>
                  {s.fechaResolucion
                    ? new Date(s.fechaResolucion).toLocaleDateString('es-ES')
                    : '—'}
                </td>
                <td className="font-mono text-slate-400">{s.cheksum?.slice(0, 12) ?? '—'}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
