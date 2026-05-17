import { prisma } from '@/lib/db';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { MarketplaceInstallButton } from '@/components/obras/MarketplaceInstallButton';

export const dynamic = 'force-dynamic';

const KIND_LABEL: Record<string, string> = {
  PROMPT_TEMPLATE: 'Plantilla de prompt',
  PRICE_CATALOG: 'Catálogo de precios',
  NORMATIVA: 'Plantilla normativa',
  CHECKLIST: 'Checklist',
};

export default async function MarketplacePage() {
  const listings = await prisma.marketplaceListing.findMany({
    where: { active: true },
    orderBy: [{ installs: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Marketplace</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Plantillas de prompt, catálogos de precios y checklists publicados por
          otros estudios. Instalar copia el contenido a tu organización.
        </p>
      </header>

      {listings.length === 0 ? (
        <EmptyState
          title="Aún no hay listados públicos"
          description="Publica el primero vía POST /api/marketplace."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {listings.map((l) => (
            <Card key={l.id}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <CardTitle>{l.title}</CardTitle>
                <Badge tone="info">{KIND_LABEL[l.kind] ?? l.kind}</Badge>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                {l.slug} ·{' '}
                {l.pricing === 'FREE'
                  ? 'gratis'
                  : `${(l.priceCents / 100).toFixed(2)} € ${l.pricing === 'SUBSCRIPTION' ? '/ mes' : ''}`}{' '}
                · {l.installs} instalaciones
              </div>
              {l.description && (
                <p className="text-sm text-slate-700 dark:text-slate-300">{l.description}</p>
              )}
              <div className="flex justify-end mt-3">
                <MarketplaceInstallButton slug={l.slug} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
