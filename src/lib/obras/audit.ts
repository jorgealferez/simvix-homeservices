import { prisma } from '@/lib/db';

const TRACKED_PROJECT_FIELDS = [
  'title',
  'summary',
  'addressLine',
  'city',
  'province',
  'postalCode',
  'cadastralId',
  'obraType',
  'useType',
  'surfaceM2',
  'status',
  'currentPhase',
  'ayuntamientoSlug',
] as const;
type TrackedField = (typeof TRACKED_PROJECT_FIELDS)[number];

type ProjectLike = Record<TrackedField, unknown> & { id: string };

/**
 * Compara el estado previo y el nuevo de un Project y persiste un
 * `ProjectAudit` por cada campo trackeado que haya cambiado.
 */
export async function auditProjectChange(
  before: ProjectLike,
  after: ProjectLike,
  actor: string,
): Promise<void> {
  const rows: { field: string; before: string | null; after: string | null }[] = [];
  for (const field of TRACKED_PROJECT_FIELDS) {
    const b = before[field];
    const a = after[field];
    if (toComparable(b) !== toComparable(a)) {
      rows.push({
        field,
        before: serialize(b),
        after: serialize(a),
      });
    }
  }
  if (!rows.length) return;
  await prisma.projectAudit.createMany({
    data: rows.map((r) => ({
      projectId: after.id,
      actor,
      action: 'UPDATE',
      field: r.field,
      before: r.before,
      after: r.after,
    })),
  });
}

export async function recordProjectAction(
  projectId: string,
  action: 'CREATE' | 'SOFT_DELETE' | 'RESTORE' | 'HARD_DELETE',
  actor: string,
  note?: string,
): Promise<void> {
  await prisma.projectAudit.create({
    data: { projectId, action, actor, field: null, before: null, after: note ?? null },
  });
}

function toComparable(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' && Number.isNaN(v)) return '';
  return String(v);
}

function serialize(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  return typeof v === 'string' ? v : JSON.stringify(v);
}
