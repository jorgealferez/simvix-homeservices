import type { Project } from '@prisma/client';

interface Props {
  project: Project;
}

export function ProjectStats({ project }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
      <Stat label="Superficie" value={project.surfaceM2 ? `${project.surfaceM2} m²` : '—'} />
      <Stat
        label="Coste IA"
        value={`$${project.aiCostUsd.toFixed(4)}`}
        hint={`${project.aiInputTokens + project.aiOutputTokens} tok`}
      />
      <Stat
        label="Ayuntamiento"
        value={project.ayuntamientoSlug ?? 'generico'}
      />
      <Stat label="Catastral" value={project.cadastralId ?? '—'} />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-800">{value}</div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
