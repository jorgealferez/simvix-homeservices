'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface Access {
  id: string;
  recipientEmail: string;
  recipientName: string | null;
  token: string;
  expiresAt: string | null;
  lastViewedAt: string | null;
  viewCount: number;
  revokedAt: string | null;
}

interface Props {
  projectId: string;
  accesses: Access[];
}

export function PortalPanel({ projectId, accesses }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  async function onIssue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setLastUrl(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/obras/${projectId}/portal`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: String(fd.get('email')),
          recipientName: String(fd.get('name') ?? '') || undefined,
          expiresInDays: fd.get('expiresInDays') ? Number(fd.get('expiresInDays')) : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      const body = await res.json();
      setLastUrl(body.url);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function revoke(accessId: string) {
    if (!confirm('¿Revocar este acceso? El enlace dejará de funcionar inmediatamente.')) return;
    await fetch(`/api/obras/${projectId}/portal?accessId=${accessId}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <Card>
      <CardTitle>Portal del cliente</CardTitle>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Genera un enlace read-only para que el cliente vea el progreso sin
        crearse cuenta. El enlace es firmado con HMAC y se puede revocar.
      </p>

      <form onSubmit={onIssue} className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
        <Input name="email" type="email" label="Email del cliente" required />
        <Input name="name" label="Nombre (opcional)" />
        <Input name="expiresInDays" type="number" label="Vence en (días)" defaultValue={30} />
        <Button type="submit" loading={submitting} size="sm">
          Emitir enlace
        </Button>
      </form>

      {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
      {lastUrl && (
        <div className="mt-3 p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded text-xs">
          Enlace generado (cópialo, se muestra UNA vez):
          <div className="mt-1 font-mono break-all">{lastUrl}</div>
        </div>
      )}

      {accesses.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800 text-sm">
          {accesses.map((a) => (
            <li key={a.id} className="py-2 flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">
                  {a.recipientEmail}
                  {a.recipientName && (
                    <span className="text-xs text-slate-500 ml-2">{a.recipientName}</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                  {a.revokedAt ? (
                    <Badge tone="danger">revocado</Badge>
                  ) : a.expiresAt && new Date(a.expiresAt) < new Date() ? (
                    <Badge tone="warn">expirado</Badge>
                  ) : (
                    <Badge tone="success">activo</Badge>
                  )}
                  <span>{a.viewCount} vistas</span>
                  {a.lastViewedAt && (
                    <span>
                      última {new Date(a.lastViewedAt).toLocaleDateString('es-ES')}
                    </span>
                  )}
                </div>
              </div>
              {!a.revokedAt && (
                <button
                  className="text-xs text-red-600 hover:underline"
                  onClick={() => revoke(a.id)}
                >
                  revocar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
