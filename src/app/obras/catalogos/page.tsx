import { prisma } from '@/lib/db';
import { getAuthContext } from '@/lib/auth/session';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { CatalogSearchClient } from '@/components/obras/CatalogSearchClient';
import { CatalogImportForm } from '@/components/obras/CatalogImportForm';

export const dynamic = 'force-dynamic';

export default async function CatalogosPage() {
  const ctx = await getAuthContext();
  const catalogs = await prisma.priceCatalog.findMany({
    where: {
      active: true,
      OR: [{ orgId: null }, ...(ctx?.activeOrgId ? [{ orgId: ctx.activeOrgId }] : [])],
    },
    orderBy: { name: 'asc' },
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Catálogos de precios</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          CYPE, BEDEC u otros. Importa por CSV, busca partidas por descripción o
          código, y crea partidas de presupuesto directamente desde aquí.
        </p>
      </header>

      <Card>
        <CardTitle>Catálogos disponibles</CardTitle>
        {catalogs.length === 0 ? (
          <EmptyState
            title="Sin catálogos cargados"
            description="Importa el primero con el formulario de abajo o con `npm run prisma:seed-catalog`."
          />
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {catalogs.map((c) => (
              <li key={c.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {c.slug} · {c.source}
                    {c.year && ` · ${c.year}`}
                    {c.orgId && ' · privado'}
                  </div>
                </div>
                <Badge tone="info">{c._count.items} partidas</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle>Buscar partidas</CardTitle>
        <CatalogSearchClient />
      </Card>

      <Card>
        <CardTitle>Importar catálogo (CSV)</CardTitle>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
          Cabecera obligatoria: <code>chapter,code,description,unit,unitPrice</code>{' '}
          (opcional <code>longDescription</code>). Separador <code>,</code> o <code>;</code>{' '}
          autodetectado.
        </p>
        <CatalogImportForm />
      </Card>
    </div>
  );
}
