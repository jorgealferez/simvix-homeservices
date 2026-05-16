import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProjectDetail } from '@/lib/obras/projects';
import { PHASES } from '@/lib/obras/phases';
import { ProjectRunner } from '@/components/obras/ProjectRunner';
import { PhaseTimeline } from '@/components/obras/PhaseTimeline';
import { DocumentList } from '@/components/obras/DocumentList';
import { BudgetTable } from '@/components/obras/BudgetTable';
import { ProjectStats } from '@/components/obras/ProjectStats';
import { Chat } from '@/components/obras/Chat';
import type { PhaseType } from '@/lib/obras/enums';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

export default async function ObraDetailPage({ params }: Params) {
  const { id } = await params;
  const project = await getProjectDetail(id);
  if (!project) notFound();

  const completed = project.phases.filter((p) => p.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      <header className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">{project.reference}</div>
            <h1 className="text-xl font-bold text-slate-900">{project.title}</h1>
            <p className="text-sm text-slate-600">
              {project.client.fullName} · {project.client.email}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {project.obraType} · {project.useType} ·{' '}
              {[project.addressLine, project.city, project.postalCode].filter(Boolean).join(', ') ||
                'sin dirección'}
            </p>
          </div>
          <div className="text-right text-sm">
            <div>
              Estado:{' '}
              <span className="font-semibold text-slate-800">{project.status.replace(/_/g, ' ')}</span>
            </div>
            <div>
              Fase actual: <span className="font-semibold">{project.currentPhase}</span>
            </div>
            <div className="text-xs text-slate-500">
              {completed}/{PHASES.length} fases completadas
            </div>
          </div>
        </div>

        <ProjectStats project={project} />

        <div className="mt-4 flex gap-3 flex-wrap">
          <ProjectRunner projectId={project.id} currentPhase={project.currentPhase as PhaseType} />
          <Link
            href={`/api/obras/${project.id}/package`}
            className="text-sm border border-slate-300 hover:border-slate-500 rounded-md px-3 py-2"
          >
            Descargar paquete PDF
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PhaseTimeline projectId={project.id} phases={project.phases} />
          <Chat projectId={project.id} currentPhase={project.currentPhase} />
          <DocumentList documents={project.documents} />
          {project.budgetItems.length > 0 && <BudgetTable items={project.budgetItems} />}
        </div>
        <aside className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-sm">
            <h2 className="font-semibold mb-2">Auditoría IA</h2>
            <p>
              Coste acumulado: <span className="font-mono">${project.aiCostUsd.toFixed(4)}</span>
            </p>
            <p>
              Tokens entrada:{' '}
              <span className="font-mono">{project.aiInputTokens.toLocaleString('es-ES')}</span>
            </p>
            <p>
              Tokens salida:{' '}
              <span className="font-mono">{project.aiOutputTokens.toLocaleString('es-ES')}</span>
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-sm">
            <h2 className="font-semibold mb-2">Eventos recientes</h2>
            <ul className="space-y-1 text-xs text-slate-600 max-h-72 overflow-auto">
              {project.events.map((e) => (
                <li key={e.id}>
                  <span className="font-mono text-slate-400">
                    {new Date(e.createdAt).toLocaleTimeString('es-ES')}
                  </span>{' '}
                  {e.type}
                </li>
              ))}
              {project.events.length === 0 && <li className="text-slate-400">Sin eventos.</li>}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
