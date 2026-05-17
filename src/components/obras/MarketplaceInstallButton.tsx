'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export function MarketplaceInstallButton({ slug }: { slug: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [err, setErr] = useState<string | null>(null);
  async function install() {
    setState('loading');
    setErr(null);
    try {
      const res = await fetch(`/api/marketplace/${slug}/install`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      setState('done');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setState('error');
    }
  }
  return (
    <div className="flex items-center gap-2">
      {err && <span className="text-xs text-red-600">{err}</span>}
      <Button size="sm" variant={state === 'done' ? 'secondary' : 'primary'} onClick={install} loading={state === 'loading'} disabled={state === 'done'}>
        {state === 'done' ? 'Instalado ✓' : 'Instalar'}
      </Button>
    </div>
  );
}
