import Link from 'next/link';
import { listProjects } from '@/lib/obras/projects';
import { PHASES } from '@/lib/obras/phases';
import { resolveAiMode } from '@/lib/ai/client';

export const dynamic = 'force-dynamic';

export default async function ObrasIndexPage() {
  const projects = await listProjects({ take: 100 });
  const mode = resolveAiMode();

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Proyectos de obra</h1>
          <p className="text-slate-600 text-sm">
            Orquestación completa con IA: intake del cliente · normativa · anteproyecto · memoria ·
            mediciones · presupuesto · planos · ESS · residuos · doc. administrativa · ayuntamiento.
          </p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded ${
            mode === 'live'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          IA: {mode === 'live' ? 'Claude en vivo' : 'modo mock'}
        </span>
      </header>

      {projects.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-lg p-10 text-center">
          <p className="text-slate-700">Todavía no hay proyectos.</p>
          <Link
            href="/obras/nuevo"
            className="inline-block mt-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-medium px-4 py-2 rounded-md"
          >
            Crear primer proyecto
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {projects.map((p) => {
            const totalPhases = PHASES.length;
            const completed = p.phases.filter((ph) => ph.status === 'COMPLETED').length;
            const pct = Math.round((completed / totalPhases) * 100);
            return (
              <Link
                key={p.id}
                href={`/obras/${p.id}`}
                className="bg-white border border-slate-200 rounded-lg p-4 hover:border-emerald-400 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {p.reference} · {p.title}
                    </div>
                    <div className="text-sm text-slate-600">
                      {p.client.fullName} · {p.client.email}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {p.obraType} · {p.useType} ·{' '}
                      {[p.addressLine, p.city].filter(Boolean).join(', ') || 'sin dirección'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      {p.status.replace(/_/g, ' ')}
                    </div>
                    <div className="text-xs text-slate-500">Fase actual: {p.currentPhase}</div>
                    <div className="w-40 bg-slate-200 rounded-full h-1.5 mt-2">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {completed}/{totalPhases} fases completadas
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
