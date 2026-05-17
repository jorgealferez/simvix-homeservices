'use client';

import { useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface VerifyResult {
  ok: boolean;
  total: number;
  firstTamperedId?: string;
  firstTamperedAt?: string;
}

export function AuditPanel({ projectId }: { projectId: string }) {
  const [busy, setBusy] = useState(false);
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onVerify() {
    setBusy(true);
    setError(null);
    try {
      // Backfill primero (idempotente), después verificar
      await fetch(`/api/obras/${projectId}/audit`, { method: 'POST' });
      const r = await fetch(`/api/obras/${projectId}/audit?verify=1`);
      if (!r.ok) throw new Error(`Error ${r.status}`);
      setVerify(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>Auditoría inmutable</CardTitle>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Cada evento del proyecto se firma con un hash encadenado (sha256). Si
        alguien manipula un evento intermedio en BD, el chequeo lo detecta.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <Button size="sm" onClick={onVerify} loading={busy} variant="secondary">
          Verificar cadena
        </Button>
        {verify && (
          <Badge tone={verify.ok ? 'success' : 'danger'}>
            {verify.ok
              ? `OK · ${verify.total} eventos`
              : `ALTERADA en evento ${verify.firstTamperedId?.slice(0, 8)}…`}
          </Badge>
        )}
      </div>
      {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
    </Card>
  );
}
