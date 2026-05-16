import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Simvix Obras — Orquestación IA cliente → ayuntamiento',
  description:
    'Plataforma de orquestación con IA para llevar tu proyecto de obra desde la primera conversación con el cliente hasta la presentación al ayuntamiento.',
};

export default function ObrasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/obras" className="flex items-center gap-2 font-bold">
            <span>🏗️</span>
            <span>Simvix Obras</span>
            <span className="text-xs font-normal text-slate-400 hidden sm:inline">
              · cliente → ayuntamiento orquestado por IA
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/obras" className="hover:text-emerald-300">
              Proyectos
            </Link>
            <Link
              href="/obras/nuevo"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-medium px-3 py-1.5 rounded-md"
            >
              Nuevo proyecto
            </Link>
            <Link href="/" className="text-slate-300 hover:text-white">
              ← Volver a Simvix Home
            </Link>
          </nav>
        </div>
      </div>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
