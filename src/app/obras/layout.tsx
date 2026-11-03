import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ObrasSessionProvider } from '@/components/obras/SessionProvider';
import { UserMenu } from '@/components/obras/UserMenu';
import { ThemeProvider, ThemeToggle } from '@/components/ui/ThemeProvider';
import { PWARegister } from '@/components/obras/PWARegister';
import { obrasDisponible } from '@/lib/obras/disponible';

export const metadata: Metadata = {
  title: 'Simvix Obras — Orquestación IA cliente → ayuntamiento',
  description:
    'Plataforma de orquestación con IA para llevar tu proyecto de obra desde la primera conversación con el cliente hasta la presentación al ayuntamiento.',
  manifest: '/manifest.webmanifest',
};

export default function ObrasLayout({ children }: { children: React.ReactNode }) {
  // Sin base de datos el módulo no se sirve: 404 de la web en vez de un 500.
  if (!obrasDisponible()) notFound();

  return (
    <ObrasSessionProvider>
      <ThemeProvider>
        <PWARegister />
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
          <div className="bg-ink text-white">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <Link href="/obras" className="flex items-center gap-2 font-bold">
                <span aria-hidden>🏗️</span>
                <span>Simvix Obras</span>
                <span className="text-xs font-normal text-slate-400 hidden lg:inline">
                  · cliente → ayuntamiento orquestado por IA
                </span>
              </Link>
              <nav className="flex items-center gap-3 text-sm">
                <Link href="/obras" className="hover:text-accent-300">
                  Proyectos
                </Link>
                <Link href="/obras/catalogos" className="hover:text-accent-300 hidden md:inline">
                  Catálogos
                </Link>
                <Link href="/obras/knowledge" className="hover:text-accent-300 hidden md:inline">
                  Normativa
                </Link>
                <Link href="/obras/cte" className="hover:text-accent-300 hidden lg:inline">
                  CTE
                </Link>
                <Link href="/obras/facturacion" className="hover:text-accent-300 hidden md:inline">
                  Facturación
                </Link>
                <Link href="/obras/marketplace" className="hover:text-accent-300 hidden lg:inline">
                  Marketplace
                </Link>
                <Link
                  href="/obras/notificaciones"
                  className="hover:text-accent-300"
                  aria-label="Notificaciones"
                  title="Notificaciones"
                >
                  🔔
                </Link>
                <Link href="/obras/admin" className="hover:text-accent-300 hidden md:inline">
                  Admin
                </Link>
                <Link href="/obras/settings" className="hover:text-accent-300">
                  Ajustes
                </Link>
                <Link
                  href="/obras/nuevo"
                  className="bg-accent-600 hover:bg-accent-700 text-white font-medium px-3 py-1.5 rounded-md"
                >
                  Nuevo
                </Link>
                <ThemeToggle />
                <UserMenu />
                <Link href="/" className="text-slate-300 hover:text-white hidden xl:inline">
                  ← Home
                </Link>
              </nav>
            </div>
          </div>
          <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        </div>
      </ThemeProvider>
    </ObrasSessionProvider>
  );
}
