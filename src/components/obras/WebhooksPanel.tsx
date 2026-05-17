'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface Endpoint {
  id: string;
  name: string;
  url: string;
  events: string;
  active: boolean;
  createdAt: string;
}

export function WebhooksPanel() {
  const [eps, setEps] = useState<Endpoint[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSecret, setLastSecret] = useState<string | null>(null);

  async function load() {
    const r = await fetch('/api/webhooks');
    if (r.ok) {
      const b = await r.json();
      setEps(b.endpoints ?? []);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setLastSecret(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: String(fd.get('name')),
          url: String(fd.get('url')),
          events: String(fd.get('events')),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      const body = await res.json();
      setLastSecret(body.secret);
      (e.target as HTMLFormElement).reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>Webhooks salientes</CardTitle>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Tu sistema recibirá POSTs HMAC-firmados (cabecera <code>x-simvix-signature</code>)
        para los eventos suscritos. Eventos típicos: <code>PROJECT_CREATED</code>,
        <code>PHASE_COMPLETED</code>, <code>SUBMITTED</code>, <code>INVITATION</code>.
      </p>
      <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end mt-3">
        <Input name="name" label="Nombre" placeholder="CRM Slack" required />
        <Input name="url" type="url" label="URL" placeholder="https://hooks.tu-app.com/..." required />
        <Input
          name="events"
          label="Eventos (CSV)"
          placeholder="PHASE_COMPLETED,SUBMITTED"
          required
        />
        <Button type="submit" size="sm" loading={busy}>
          Crear
        </Button>
      </form>
      {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
      {lastSecret && (
        <div className="mt-3 p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded text-xs">
          Secret (cópialo, se muestra UNA vez):{' '}
          <span className="font-mono break-all">{lastSecret}</span>
        </div>
      )}

      <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800 text-sm">
        {eps.length === 0 && (
          <li className="py-2 text-xs text-slate-500">Sin webhooks configurados.</li>
        )}
        {eps.map((e) => (
          <li key={e.id} className="py-2 flex items-center justify-between gap-2">
            <div>
              <div className="font-medium">{e.name}</div>
              <div className="text-xs text-slate-500 font-mono break-all">{e.url}</div>
              <div className="text-xs text-slate-500 mt-0.5">{e.events}</div>
            </div>
            <Badge tone={e.active ? 'success' : 'neutral'}>
              {e.active ? 'activo' : 'inactivo'}
            </Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
