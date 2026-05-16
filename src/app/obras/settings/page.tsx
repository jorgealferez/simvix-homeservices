import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { InvitationsPanel } from '@/components/obras/InvitationsPanel';
import { WebhooksPanel } from '@/components/obras/WebhooksPanel';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/obras/login?callbackUrl=/obras/settings');

  const orgs = await prisma.organization.findMany({
    where: { id: { in: ctx.memberships.map((m) => m.orgId) }, deletedAt: null },
    orderBy: { name: 'asc' },
  });

  const activeOrg = orgs.find((o) => o.id === ctx.activeOrgId);
  const members = activeOrg
    ? await prisma.organizationMember.findMany({
        where: { orgId: activeOrg.id },
        include: { user: { select: { id: true, name: true, email: true, lastLoginAt: true } } },
        orderBy: { createdAt: 'asc' },
      })
    : [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Configuración
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Perfil, organizaciones, miembros y cuotas.
        </p>
      </header>

      <Card>
        <CardTitle>Perfil</CardTitle>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm mt-3">
          <dt className="text-slate-500 dark:text-slate-400">Email</dt>
          <dd className="font-mono">{ctx.email}</dd>
          <dt className="text-slate-500 dark:text-slate-400">User ID</dt>
          <dd className="font-mono text-xs">{ctx.userId}</dd>
          <dt className="text-slate-500 dark:text-slate-400">Admin plataforma</dt>
          <dd>{ctx.isPlatformAdmin ? 'Sí' : 'No'}</dd>
        </dl>
      </Card>

      <Card>
        <CardTitle>Mis organizaciones</CardTitle>
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {ctx.memberships.map((m) => {
            const isActive = m.orgId === ctx.activeOrgId;
            return (
              <li key={m.orgId} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{m.orgSlug}</div>
                  <div className="text-xs text-slate-500">{m.orgId}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={m.role === 'OWNER' ? 'success' : m.role === 'VIEWER' ? 'neutral' : 'info'}>
                    {m.role}
                  </Badge>
                  {isActive && <Badge tone="success">activa</Badge>}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {activeOrg && (
        <Card>
          <CardTitle>Cuotas — {activeOrg.name}</CardTitle>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mt-3">
            <Quota label="Proyectos" value={activeOrg.maxProjects} />
            <Quota label="Tokens IA mes" value={activeOrg.maxAiTokensMonthly} usage={activeOrg.aiTokensMonthly} />
            <Quota label="Storage (MB)" value={activeOrg.maxStorageMb} />
          </dl>
        </Card>
      )}

      {activeOrg && (
        <Card>
          <CardTitle>Miembros de {activeOrg.name}</CardTitle>
          <table className="w-full text-sm mt-3">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left py-1">Email</th>
                <th className="text-left">Nombre</th>
                <th className="text-left">Rol</th>
                <th className="text-left">Último login</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1">{m.user.email}</td>
                  <td>{m.user.name ?? '—'}</td>
                  <td>
                    <Badge tone={m.role === 'OWNER' ? 'success' : 'neutral'}>{m.role}</Badge>
                  </td>
                  <td className="text-xs text-slate-500">
                    {m.user.lastLoginAt
                      ? new Date(m.user.lastLoginAt).toLocaleString('es-ES')
                      : 'nunca'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-500 mt-2">
            La edición de roles vía UI llega en una iteración posterior. Mientras
            tanto, un administrador puede modificarlos vía API:{' '}
            <code className="font-mono text-[11px]">PATCH /api/organizations/[id]/members</code>.
          </p>
        </Card>
      )}

      <InvitationsPanel />
      <WebhooksPanel />

      <p className="text-xs text-slate-500">
        ¿Necesitas crear una organización nueva? Ver{' '}
        <Link className="underline" href="/obras">
          panel principal
        </Link>{' '}
        o invocar <code className="font-mono">POST /api/organizations</code>.
      </p>
    </div>
  );
}

function Quota({
  label,
  value,
  usage,
}: {
  label: string;
  value: number | null;
  usage?: number;
}) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="font-mono">
        {usage !== undefined ? `${usage.toLocaleString('es-ES')} / ` : ''}
        {value === null ? '∞' : value.toLocaleString('es-ES')}
      </div>
    </div>
  );
}
