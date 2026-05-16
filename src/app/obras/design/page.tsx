import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';

export const dynamic = 'force-static';

export default function DesignSystemPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Design system — Simvix Obras</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Catálogo de componentes reutilizables del módulo. Sirve de referencia
          rápida (y sustituye a Storybook hasta P03 avanzado).
        </p>
      </header>

      <Card>
        <CardTitle>Buttons</CardTitle>
        <div className="flex flex-wrap gap-2 mt-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="subtle">Subtle</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </Card>

      <Card>
        <CardTitle>Badges</CardTitle>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge>Neutral</Badge>
          <Badge tone="success">Completada</Badge>
          <Badge tone="warn">Necesita revisión</Badge>
          <Badge tone="info">En ejecución</Badge>
          <Badge tone="danger">Error</Badge>
          <Badge tone="mock">Mock</Badge>
        </div>
      </Card>

      <Card>
        <CardTitle>Inputs</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <Input label="Email" name="email" type="email" placeholder="hola@simvix.com" />
          <Input
            label="DNI"
            name="dni"
            hint="Se cifra en BD con AES-256-GCM"
            placeholder="12345678X"
          />
          <Input label="Con error" name="bad" error="Este campo es obligatorio" />
          <Select
            label="Tipo de obra"
            name="obra"
            options={[
              { value: 'a', label: 'Reforma interior' },
              { value: 'b', label: 'Obra nueva' },
            ]}
          />
        </div>
        <Textarea
          label="Mensaje del cliente"
          name="msg"
          rows={3}
          placeholder="Describe la necesidad…"
          full
        />
      </Card>

      <Card>
        <CardTitle>Empty state</CardTitle>
        <div className="mt-3">
          <EmptyState
            title="Todavía no hay proyectos"
            description="Crea el primero o importa uno existente."
            action={<Button>Crear proyecto</Button>}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Skeletons</CardTitle>
        <div className="mt-3 space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <SkeletonText lines={4} />
        </div>
      </Card>

      <p className="text-xs text-slate-500">
        Estos componentes viven en{' '}
        <code className="font-mono">src/components/ui</code>. Soportan dark
        mode automáticamente vía Tailwind (clase <code>dark</code> en{' '}
        <code>&lt;html&gt;</code>).
      </p>
    </div>
  );
}
