'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PHASES } from '@/lib/obras/phases';
import type { Phase } from '@prisma/client';
import type { PhaseStatus, PhaseType } from '@/lib/obras/enums';

interface Props {
  projectId: string;
  phases: Phase[];
}

const STATUS_COLORS: Record<PhaseStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-600 border-slate-200',
  RUNNING: 'bg-blue-100 text-blue-700 border-blue-200 animate-pulse',
  NEEDS_REVIEW: 'bg-amber-100 text-amber-700 border-amber-200',
  COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  FAILED: 'bg-red-100 text-red-700 border-red-200',
  SKIPPED: 'bg-slate-100 text-slate-400 border-slate-200',
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
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <h2 className="font-semibold text-slate-900 mb-4">Workflow de orquestación</h2>
      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
      <ol className="space-y-2">
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
                  <span>{def.icon}</span>
                  <span>
                    {def.order}. {def.label}
                  </span>
                </div>
                <div className="text-xs text-slate-600">{def.description}</div>
                {ph?.notes && (
                  <div className="text-xs text-red-700 mt-1">⚠ {ph.notes}</div>
                )}
              </div>
              <div className="text-right text-xs">
                <span className="block uppercase font-medium">{status.replace(/_/g, ' ')}</span>
                <button
                  onClick={() => runPhase(def.type)}
                  disabled={running === def.type}
                  className="mt-1 text-xs underline disabled:opacity-50"
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
    </div>
  );
}
