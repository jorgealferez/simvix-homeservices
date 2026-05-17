import { prisma } from '@/lib/db';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { KnowledgeSearchClient } from '@/components/obras/KnowledgeSearchClient';

export const dynamic = 'force-dynamic';

const KIND_TONE: Record<string, 'success' | 'info' | 'warn' | 'neutral'> = {
  CTE_DB: 'success',
  PGOU: 'info',
  ORDENANZA: 'info',
  RD: 'warn',
  AUTONOMICO: 'warn',
};

export default async function KnowledgePage() {
  const docs = await prisma.knowledgeDoc.findMany({
    orderBy: [{ kind: 'asc' }, { title: 'asc' }],
    include: { _count: { select: { chunks: true } } },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Base de conocimiento normativo</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Documentos del CTE, PGOU municipales, ordenanzas y RDs ingeridos para
          que los agentes IA citen normativa real (RAG).
        </p>
      </header>

      <Card>
        <CardTitle>Búsqueda semántica</CardTitle>
        <KnowledgeSearchClient />
      </Card>

      <Card>
        <CardTitle>Documentos ingeridos</CardTitle>
        {docs.length === 0 ? (
          <EmptyState
            title="Sin documentos cargados"
            description="Importa el CTE con `npm run prisma:seed-cte` o vía POST /api/knowledge."
          />
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {docs.map((d) => (
              <li key={d.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{d.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {d.slug}
                    {d.region && ` · ${d.region}`}
                    {d.version && ` · v${d.version}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={KIND_TONE[d.kind] ?? 'neutral'}>{d.kind}</Badge>
                  <Badge>{d._count.chunks} chunks</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
