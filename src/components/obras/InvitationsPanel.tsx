'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'ARCHITECT', label: 'Arquitecto' },
  { value: 'TECHNICIAN', label: 'Técnico' },
  { value: 'EXTERNAL', label: 'Colaborador externo' },
  { value: 'VIEWER', label: 'Sólo lectura' },
];

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string | null;
  createdAt: string;
}

export function InvitationsPanel() {
  const router = useRouter();
  const [invs, setInvs] = useState<Invitation[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  async function load() {
    const r = await fetch('/api/invitations');
    if (r.ok) {
      const body = await r.json();
      setInvs(body.invitations ?? []);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setLastUrl(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: String(fd.get('email')),
          role: String(fd.get('role')),
          expiresInDays: Number(fd.get('expiresInDays') ?? 14),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      const body = await res.json();
      setLastUrl(body.url);
      (e.target as HTMLFormElement).reset();
      await load();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>Invitaciones pendientes</CardTitle>
      <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end mt-3">
        <Input name="email" type="email" label="Email" required />
        <Select name="role" label="Rol" options={ROLES} />
        <Input name="expiresInDays" type="number" label="Vence en (días)" defaultValue={14} />
        <Button type="submit" size="sm" loading={busy}>
          Invitar
        </Button>
      </form>
      {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
      {lastUrl && (
        <div className="mt-3 p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded text-xs">
          Enlace de aceptación generado: <span className="font-mono break-all">{lastUrl}</span>
        </div>
      )}

      <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800 text-sm">
        {invs.length === 0 && (
          <li className="py-2 text-xs text-slate-500">Sin invitaciones pendientes.</li>
        )}
        {invs.map((i) => (
          <li key={i.id} className="py-2 flex items-center justify-between gap-2">
            <div>
              <div className="font-medium">{i.email}</div>
              <div className="text-xs text-slate-500">
                {i.expiresAt
                  ? `Expira ${new Date(i.expiresAt).toLocaleDateString('es-ES')}`
                  : 'Sin expiración'}
              </div>
            </div>
            <Badge tone="info">{i.role}</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
