import Link from 'next/link';
import { Card, CardTitle } from '@/components/ui/Card';

const SECTIONS = [
  {
    title: 'Proyectos',
    icon: '🏗️',
    items: [
      { href: '/obras', label: 'Listado de proyectos' },
      { href: '/obras/nuevo', label: 'Nuevo proyecto' },
    ],
  },
  {
    title: 'Datos comerciales',
    icon: '💼',
    items: [
      { href: '/obras/clientes', label: 'Clientes' },
      { href: '/obras/facturacion', label: 'Facturación' },
    ],
  },
  {
    title: 'Conocimiento técnico',
    icon: '📚',
    items: [
      { href: '/obras/catalogos', label: 'Catálogos de precios (CYPE/BEDEC)' },
      { href: '/obras/knowledge', label: 'Base de normativa (PGOU + CTE)' },
      { href: '/obras/cte', label: 'Cálculos CTE (HE / SI / SUA / HR / HS / SE)' },
    ],
  },
  {
    title: 'Operación',
    icon: '⚙️',
    items: [
      { href: '/obras/notificaciones', label: 'Bandeja de notificaciones' },
      { href: '/obras/marketplace', label: 'Marketplace de plantillas' },
      { href: '/obras/admin', label: 'Admin (métricas / auditoría / webhooks)' },
    ],
  },
  {
    title: 'Cuenta',
    icon: '👤',
    items: [
      { href: '/obras/settings', label: 'Perfil, organización y miembros' },
      { href: '/obras/design', label: 'Design system (referencia interna)' },
    ],
  },
];

export default function ObrasHomePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Bienvenido a Simvix Obras</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Plataforma de orquestación IA cliente → ayuntamiento. Atajo a todas las áreas:
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SECTIONS.map((sec) => (
          <Card key={sec.title}>
            <CardTitle>
              <span aria-hidden className="mr-2">{sec.icon}</span>
              {sec.title}
            </CardTitle>
            <ul className="mt-2 space-y-1 text-sm">
              {sec.items.map((it) => (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className="text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    {it.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        ¿Buscas un proyecto concreto? Ve a{' '}
        <Link href="/obras/proyectos" className="underline">
          Listado de proyectos
        </Link>
        .
      </p>
    </div>
  );
}
