import { prisma } from '@/lib/db';
import { getAuthContext } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/obras/login?callbackUrl=/obras/admin');

  const [projects, tasksByStatus, signatures, submissions, drawings, unreadNotif] = await Promise.all([
    prisma.project.count({ where: { deletedAt: null } }),
    prisma.taskRun.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.signature.count(),
    prisma.submission.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.drawing.count({ where: { deletedAt: null } }),
    prisma.notification.count({ where: { userId: ctx.userId, status: 'UNREAD' } }),
  ]);

  const taskMap: Record<string, number> = {};
  tasksByStatus.forEach((t) => (taskMap[t.status] = t._count._all));
  const subMap: Record<string, number> = {};
  submissions.forEach((s) => (subMap[s.status] = s._count._all));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Admin & observabilidad</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Métricas internas, endpoints técnicos y atajos de gestión.
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Stat label="Proyectos activos" value={projects} />
        <Stat label="Planos almacenados" value={drawings} />
        <Stat label="Firmas emitidas" value={signatures} />
        <Stat label="Notificaciones sin leer" value={unreadNotif} />
      </div>

      <Card>
        <CardTitle>Pipeline IA (TaskRun)</CardTitle>
        <div className="flex gap-2 flex-wrap mt-2">
          {Object.entries(taskMap).length === 0 ? (
            <span className="text-xs text-slate-500">Sin tareas todavía.</span>
          ) : (
            Object.entries(taskMap).map(([s, n]) => (
              <Badge
                key={s}
                tone={s === 'SUCCEEDED' ? 'success' : s === 'FAILED' ? 'danger' : 'neutral'}
              >
                {s}: {n}
              </Badge>
            ))
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>Presentaciones (Submission)</CardTitle>
        <div className="flex gap-2 flex-wrap mt-2">
          {Object.entries(subMap).length === 0 ? (
            <span className="text-xs text-slate-500">Sin presentaciones todavía.</span>
          ) : (
            Object.entries(subMap).map(([s, n]) => (
              <Badge
                key={s}
                tone={
                  s === 'APPROVED'
                    ? 'success'
                    : s === 'REJECTED'
                      ? 'danger'
                      : s === 'REQUIRES_FIX'
                        ? 'warn'
                        : 'info'
                }
              >
                {s}: {n}
              </Badge>
            ))
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>Endpoints técnicos</CardTitle>
        <ul className="text-sm space-y-1 mt-2">
          <li>
            <Link className="underline text-emerald-700 dark:text-emerald-400" href="/api/health">
              GET /api/health
            </Link>{' '}
            — estado de la BD + modo IA.
          </li>
          <li>
            <Link className="underline text-emerald-700 dark:text-emerald-400" href="/api/metrics">
              GET /api/metrics
            </Link>{' '}
            — métricas en formato Prometheus.
          </li>
          <li>
            <code>GET /api/obras/&lt;id&gt;/audit?verify=1</code> — verifica la hash chain del proyecto.
          </li>
          <li>
            <code>GET /api/obras/&lt;id&gt;/package</code> — descarga PDF consolidado del proyecto.
          </li>
        </ul>
      </Card>

      <Card>
        <CardTitle>Otras herramientas</CardTitle>
        <ul className="text-sm space-y-1 mt-2">
          <li>
            <Link className="underline text-emerald-700 dark:text-emerald-400" href="/obras/settings">
              Configurar miembros y cuotas de la organización
            </Link>
          </li>
          <li>
            <Link className="underline text-emerald-700 dark:text-emerald-400" href="/obras/catalogos">
              Importar / consultar catálogos CYPE/BEDEC
            </Link>
          </li>
          <li>
            <Link className="underline text-emerald-700 dark:text-emerald-400" href="/obras/knowledge">
              Base de conocimiento (PGOU + CTE)
            </Link>
          </li>
          <li>
            <Link className="underline text-emerald-700 dark:text-emerald-400" href="/obras/marketplace">
              Marketplace de plantillas
            </Link>
          </li>
        </ul>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="!p-3">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="text-xl font-bold">{value.toLocaleString('es-ES')}</div>
    </Card>
  );
}
