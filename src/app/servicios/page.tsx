import type { Metadata } from 'next';
import Link from 'next/link';
import { services } from '@/lib/services';
import ServiceCard from '@/components/ServiceCard';

export const metadata: Metadata = {
  title: 'Todos los Servicios del Hogar',
  description:
    'Explora todos nuestros servicios domésticos: recogida de niños del colegio, limpieza del hogar, niñera, hacer la compra, cuidado de personas mayores y más.',
  alternates: {
    canonical: 'https://homeservices.simvix.com/servicios',
  },
};

export default function ServiciosPage() {
  return (
    <div className="py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Ruta de navegación" className="mb-8">
          <ol className="flex items-center gap-2 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-primary-600">
                Inicio
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-gray-900 font-medium">Servicios</li>
          </ol>
        </nav>

        {/* Page header */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
            Nuestros servicios del hogar
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl">
            Profesionales verificados y con experiencia para cuidar de lo que
            más importa. Elige el servicio que necesitas y solícitalo hoy.
          </p>
        </div>

        {/* Services list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} variant="grid" />
          ))}
        </div>

        {/* CTA */}
        <div className="bg-primary-50 border border-primary-100 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            ¿Necesitas algo diferente?
          </h2>
          <p className="text-gray-600 mb-6">
            Si no encuentras lo que buscas en nuestra lista, cuéntanoslo.
            Buscamos la solución para ti.
          </p>
          <Link
            href="/contacto"
            className="inline-flex items-center gap-2 bg-primary-600 text-white hover:bg-primary-700 font-bold text-lg px-8 py-4 rounded-xl shadow-md transition-all"
          >
            Contactar ahora
          </Link>
        </div>
      </div>
    </div>
  );
}
