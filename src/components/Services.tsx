import Link from 'next/link';
import { services } from '@/lib/services';
import ServiceCard from './ServiceCard';

export default function Services() {
  return (
    <section className="py-20 bg-gray-50" id="servicios" aria-labelledby="services-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-14">
          <span className="inline-block bg-primary-100 text-primary-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            Nuestros servicios
          </span>
          <h2
            id="services-heading"
            className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4"
          >
            Todo lo que necesita tu hogar
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Soluciones integrales para el día a día de tu familia. Personal
            cualificado, verificado y con experiencia demostrada.
          </p>
        </div>

        {/* Services grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} variant="featured" />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/contacto"
            className="inline-flex items-center gap-2 bg-primary-600 text-white hover:bg-primary-700 font-bold text-lg px-8 py-4 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            Solicitar tu servicio ahora
            <span aria-hidden="true">→</span>
          </Link>
          <p className="mt-3 text-gray-500 text-sm">
            Sin compromiso · Respuesta en menos de 24 horas
          </p>
        </div>
      </div>
    </section>
  );
}
