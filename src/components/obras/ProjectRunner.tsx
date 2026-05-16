'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PhaseType } from '@/lib/obras/enums';

interface Props {
  projectId: string;
  currentPhase: PhaseType;
}

export function ProjectRunner({ projectId, currentPhase }: Props) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAll() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/obras/${projectId}/run-phase`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={runAll}
        disabled={running}
        className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-300 text-slate-900 font-medium px-4 py-2 rounded-md text-sm"
      >
        {running ? 'Ejecutando todo el pipeline…' : `▶ Ejecutar pipeline completo (desde ${currentPhase})`}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
