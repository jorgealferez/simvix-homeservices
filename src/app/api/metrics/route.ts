import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * P33 — Metrics endpoint en formato Prometheus.
 *
 * No incluye autenticación (la idea es que el endpoint esté detrás de un
 * proxy/firewall y sólo lo lea Prometheus). Si quieres protegerlo, añade un
 * token en cabecera y compara con OBRAS_METRICS_TOKEN.
 */
export async function GET(req: Request) {
  const requiredToken = process.env.OBRAS_METRICS_TOKEN;
  if (requiredToken) {
    const got = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (got !== requiredToken) {
      return new Response('forbidden', { status: 403 });
    }
  }

  const [projects, tasks, signatures, submissions, notifications, orgs] = await Promise.all([
    prisma.project.count({ where: { deletedAt: null } }),
    prisma.taskRun.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.signature.count(),
    prisma.submission.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.notification.count({ where: { status: 'UNREAD' } }),
    prisma.organization.count({ where: { deletedAt: null } }),
  ]);

  const lines: string[] = [];
  lines.push('# HELP simvix_obras_projects_total Active projects (not soft-deleted).');
  lines.push('# TYPE simvix_obras_projects_total gauge');
  lines.push(`simvix_obras_projects_total ${projects}`);

  lines.push('# HELP simvix_obras_organizations_total Active organizations.');
  lines.push('# TYPE simvix_obras_organizations_total gauge');
  lines.push(`simvix_obras_organizations_total ${orgs}`);

  lines.push('# HELP simvix_obras_task_runs_total Task runs by status.');
  lines.push('# TYPE simvix_obras_task_runs_total counter');
  for (const t of tasks) {
    lines.push(`simvix_obras_task_runs_total{status="${t.status}"} ${t._count._all}`);
  }

  lines.push('# HELP simvix_obras_submissions_total Submissions by status.');
  lines.push('# TYPE simvix_obras_submissions_total gauge');
  for (const s of submissions) {
    lines.push(`simvix_obras_submissions_total{status="${s.status}"} ${s._count._all}`);
  }

  lines.push('# HELP simvix_obras_signatures_total Total signatures issued.');
  lines.push('# TYPE simvix_obras_signatures_total counter');
  lines.push(`simvix_obras_signatures_total ${signatures}`);

  lines.push('# HELP simvix_obras_notifications_unread In-app notifications unread.');
  lines.push('# TYPE simvix_obras_notifications_unread gauge');
  lines.push(`simvix_obras_notifications_unread ${notifications}`);

  return new Response(lines.join('\n') + '\n', {
    status: 200,
    headers: { 'content-type': 'text/plain; version=0.0.4' },
  });
}
