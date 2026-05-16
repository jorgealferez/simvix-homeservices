import { Card, CardTitle } from '@/components/ui/Card';
import { CteCheckClient } from '@/components/obras/CteCheckClient';

export const dynamic = 'force-static';

export default function CtePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Cálculos CTE</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Verificación orientativa del cumplimiento mínimo del CTE. Para
          certificación oficial sigue siendo necesario HULC, CE3X o CYPECAD.
        </p>
      </header>

      <Card>
        <CardTitle>Comprobador rápido</CardTitle>
        <CteCheckClient />
      </Card>
    </div>
  );
}
