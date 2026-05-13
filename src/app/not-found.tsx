import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Página no encontrada',
  description: 'La página que buscas no existe.',
};

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center py-20 px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl mb-4" aria-hidden="true">
          🤷
        </p>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          Página no encontrada
        </h1>
        <p className="text-gray-600 mb-8">
          Lo sentimos, la página que buscas no existe o ha sido movida.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="bg-primary-600 text-white hover:bg-primary-700 font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Volver al inicio
          </Link>
          <Link
            href="/servicios"
            className="border-2 border-primary-600 text-primary-600 hover:bg-primary-50 font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Ver servicios
          </Link>
        </div>
      </div>
    </div>
  );
}
