import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { resolveToken, recordPortalView } from '@/lib/obras/portal';
import { PHASES } from '@/lib/obras/phases';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ token: string }>;
}

export default async function PortalPage({ params }: Params) {
  const { token } = await params;
  const access = await resolveToken(token);
  if (!access) notFound();

  await recordPortalView(token);

  const project = await prisma.project.findUnique({
    where: { id: access.projectId },
    include: {
      phases: { orderBy: { order: 'asc' } },
      documents: { where: { deletedAt: null }, orderBy: { type: 'asc' } },
      submissions: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!project) notFound();

  const completed = project.phases.filter((p) => p.status === 'COMPLETED').length;
  const pct = Math.round((completed / PHASES.length) * 100);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <header>
          <div className="text-xs text-slate-500 mb-1">Portal del cliente</div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <p className="text-sm text-slate-600">
            Ref. {project.reference} · {project.obraType} · {project.useType}
          </p>
          <p className="text-xs text-slate-500">
            Acceso para {access.recipientName ?? access.recipientEmail}
            {access.expiresAt && ` · expira ${access.expiresAt.toLocaleDateString('es-ES')}`}
          </p>
        </header>

        <Card>
          <CardTitle>Estado del proyecto</CardTitle>
          <div className="mt-3 text-sm">
            <div>Fase actual: <strong>{project.currentPhase}</strong></div>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-2 bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs">{completed}/{PHASES.length}</span>
            </div>
          </div>
          <ul className="mt-4 space-y-1 text-xs">
            {PHASES.map((def) => {
              const ph = project.phases.find((x) => x.type === def.type);
              return (
                <li key={def.type} className="flex items-center justify-between">
                  <span>{def.icon} {def.label}</span>
                  <Badge
                    tone={
                      ph?.status === 'COMPLETED'
                        ? 'success'
                        : ph?.status === 'FAILED'
                          ? 'danger'
                          : ph?.status === 'NEEDS_REVIEW'
                            ? 'warn'
                            : 'neutral'
                    }
                  >
                    {ph?.status ?? 'PENDING'}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <CardTitle>Documentos compartidos</CardTitle>
          {project.documents.length === 0 ? (
            <p className="text-sm text-slate-500 mt-2">Aún no hay documentos publicados.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {project.documents.map((d) => (
                <li key={d.id}>
                  <span className="font-medium">{d.title}</span>
                  <span className="text-xs text-slate-500 ml-2">v{d.version}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {project.submissions.length > 0 && (
          <Card>
            <CardTitle>Presentaciones al ayuntamiento</CardTitle>
            <ul className="mt-2 text-sm space-y-1">
              {project.submissions.map((s) => (
                <li key={s.id}>
                  <span className="font-medium">{s.ayuntamientoSlug}</span>
                  <Badge
                    tone={s.status === 'APPROVED' ? 'success' : s.status === 'REJECTED' ? 'danger' : 'info'}
                    className="ml-2"
                  >
                    {s.status}
                  </Badge>
                  {s.registroEntrada && <span className="text-xs text-slate-500 ml-2">{s.registroEntrada}</span>}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <footer className="text-center text-xs text-slate-400 pt-6">
          Simvix Obras · vista read-only para el cliente final
        </footer>
      </div>
    </div>
  );
}
