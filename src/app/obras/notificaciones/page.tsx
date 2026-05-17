import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getAuthContext } from '@/lib/auth/session';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { NotificationsActions } from '@/components/obras/NotificationsActions';

export const dynamic = 'force-dynamic';

export default async function NotificacionesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/obras/login?callbackUrl=/obras/notificaciones');

  const notifications = await prisma.notification.findMany({
    where: { userId: ctx.userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const unread = notifications.filter((n) => n.status === 'UNREAD').length;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Notificaciones</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Bandeja del usuario. {unread > 0 && <strong>{unread} sin leer.</strong>}
          </p>
        </div>
      </header>

      {notifications.length === 0 ? (
        <EmptyState
          title="Sin notificaciones"
          description="Aparecerán aquí cuando se complete una fase, se firme un documento o llegue una invitación."
        />
      ) : (
        <Card>
          <NotificationsActions
            items={notifications.map((n) => ({
              id: n.id,
              type: n.type,
              title: n.title,
              body: n.body,
              status: n.status,
              createdAt: n.createdAt.toISOString(),
            }))}
          />
        </Card>
      )}
    </div>
  );
}
