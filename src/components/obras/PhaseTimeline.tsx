'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PHASES } from '@/lib/obras/phases';
import type { Phase } from '@prisma/client';
import type { PhaseStatus, PhaseType } from '@/lib/obras/enums';
import { Card, CardTitle } from '@/components/ui/Card';

interface Props {
  projectId: string;
  phases: Phase[];
}

const STATUS_COLORS: Record<PhaseStatus, string> = {
  PENDING:
    'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  RUNNING:
    'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 animate-pulse',
  NEEDS_REVIEW:
    'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  COMPLETED:
    'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  FAILED:
    'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  SKIPPED:
    'bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-800',
};

export function PhaseTimeline({ projectId, phases }: Props) {
  const router = useRouter();
  const [running, setRunning] = useState<PhaseType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const map = new Map(phases.map((p) => [p.type as PhaseType, p]));

  async function runPhase(phase: PhaseType) {
    setRunning(phase);
    setError(null);
    try {
      const res = await fetch(`/api/obras/${projectId}/run-phase`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phase }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(null);
    }
  }

  return (
    <Card>
      <CardTitle>Workflow de orquestación</CardTitle>
      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
      <ol className="space-y-2 mt-3">
        {PHASES.map((def) => {
          const ph = map.get(def.type);
          const status = (ph?.status ?? 'PENDING') as PhaseStatus;
          return (
            <li
              key={def.type}
              className={`border rounded-md px-3 py-2 flex items-start justify-between gap-3 ${STATUS_COLORS[status]}`}
            >
              <div>
                <div className="font-medium flex items-center gap-2">
                  <span aria-hidden>{def.icon}</span>
                  <span>
                    {def.order}. {def.label}
                  </span>
                </div>
                <div className="text-xs opacity-80">{def.description}</div>
                {ph?.notes && <div className="text-xs text-red-700 mt-1">⚠ {ph.notes}</div>}
              </div>
              <div className="text-right text-xs">
                <span className="block uppercase font-medium">{status.replace(/_/g, ' ')}</span>
                <button
                  onClick={() => runPhase(def.type)}
                  disabled={running === def.type}
                  className="mt-1 text-xs underline disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded"
                >
                  {running === def.type
                    ? 'ejecutando…'
                    : status === 'COMPLETED'
                      ? 're-ejecutar'
                      : 'ejecutar'}
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
