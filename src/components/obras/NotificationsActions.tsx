'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';

interface Item {
  id: string;
  type: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
}

export function NotificationsActions({ items }: { items: Item[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function mark(status: 'READ' | 'DISMISSED', ids: string[]) {
    setPending(true);
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids, status }),
    });
    setPending(false);
    router.refresh();
  }

  const unreadIds = items.filter((i) => i.status === 'UNREAD').map((i) => i.id);

  return (
    <div>
      {unreadIds.length > 0 && (
        <div className="text-right mb-3">
          <button
            disabled={pending}
            onClick={() => mark('READ', unreadIds)}
            className="text-xs underline text-emerald-700 dark:text-emerald-400 disabled:opacity-50"
          >
            Marcar todas como leídas
          </button>
        </div>
      )}
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((n) => (
          <li key={n.id} className="py-2">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge tone={n.status === 'UNREAD' ? 'info' : 'neutral'}>{n.type}</Badge>
                  <span className="font-medium">{n.title}</span>
                </div>
                <p className="mt-1 text-slate-700 dark:text-slate-300">{n.body}</p>
                <div className="text-xs text-slate-500 mt-1">
                  {new Date(n.createdAt).toLocaleString('es-ES')}
                </div>
              </div>
              <div className="text-right text-xs space-x-2">
                {n.status === 'UNREAD' && (
                  <button
                    disabled={pending}
                    onClick={() => mark('READ', [n.id])}
                    className="underline text-emerald-700 dark:text-emerald-400 disabled:opacity-50"
                  >
                    leído
                  </button>
                )}
                {n.status !== 'DISMISSED' && (
                  <button
                    disabled={pending}
                    onClick={() => mark('DISMISSED', [n.id])}
                    className="underline text-slate-500 disabled:opacity-50"
                  >
                    descartar
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
