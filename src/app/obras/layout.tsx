import type { Metadata } from 'next';
import Link from 'next/link';
import { ObrasSessionProvider } from '@/components/obras/SessionProvider';
import { UserMenu } from '@/components/obras/UserMenu';
import { ThemeProvider, ThemeToggle } from '@/components/ui/ThemeProvider';
import { PWARegister } from '@/components/obras/PWARegister';

export const metadata: Metadata = {
  title: 'Simvix Obras — Orquestación IA cliente → ayuntamiento',
  description:
    'Plataforma de orquestación con IA para llevar tu proyecto de obra desde la primera conversación con el cliente hasta la presentación al ayuntamiento.',
  manifest: '/manifest.webmanifest',
  themeColor: '#10b981',
};

export default function ObrasLayout({ children }: { children: React.ReactNode }) {
  return (
    <ObrasSessionProvider>
      <ThemeProvider>
        <PWARegister />
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
          <div className="bg-slate-900 text-white">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <Link href="/obras" className="flex items-center gap-2 font-bold">
                <span aria-hidden>🏗️</span>
                <span>Simvix Obras</span>
                <span className="text-xs font-normal text-slate-400 hidden lg:inline">
                  · cliente → ayuntamiento orquestado por IA
                </span>
              </Link>
              <nav className="flex items-center gap-3 text-sm">
                <Link href="/obras" className="hover:text-emerald-300">
                  Proyectos
                </Link>
                <Link href="/obras/catalogos" className="hover:text-emerald-300 hidden md:inline">
                  Catálogos
                </Link>
                <Link href="/obras/knowledge" className="hover:text-emerald-300 hidden md:inline">
                  Normativa
                </Link>
                <Link href="/obras/cte" className="hover:text-emerald-300 hidden lg:inline">
                  CTE
                </Link>
                <Link href="/obras/facturacion" className="hover:text-emerald-300 hidden md:inline">
                  Facturación
                </Link>
                <Link href="/obras/marketplace" className="hover:text-emerald-300 hidden lg:inline">
                  Marketplace
                </Link>
                <Link
                  href="/obras/notificaciones"
                  className="hover:text-emerald-300"
                  aria-label="Notificaciones"
                  title="Notificaciones"
                >
                  🔔
                </Link>
                <Link href="/obras/admin" className="hover:text-emerald-300 hidden md:inline">
                  Admin
                </Link>
                <Link href="/obras/settings" className="hover:text-emerald-300">
                  Ajustes
                </Link>
                <Link
                  href="/obras/nuevo"
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-medium px-3 py-1.5 rounded-md"
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
