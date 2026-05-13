import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { services, getServiceBySlug } from '@/lib/services';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return {};

  return {
    title: service.title,
    description: service.fullDescription.slice(0, 160),
    keywords: service.keywords,
    alternates: {
      canonical: `https://homeservices.simvix.com/servicios/${service.slug}`,
    },
    openGraph: {
      title: `${service.title} | Simvix Home Services`,
      description: service.shortDescription,
    },
  };
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  return (
    <div className="py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Service',
              name: service.title,
              description: service.fullDescription,
              provider: {
                '@type': 'LocalBusiness',
                name: 'Simvix Home Services',
                url: 'https://homeservices.simvix.com',
              },
              areaServed: 'ES',
              offers: {
                '@type': 'Offer',
                description: service.price,
              },
            }),
          }}
        />

        {/* Breadcrumb */}
        <nav aria-label="Ruta de navegación" className="mb-8">
          <ol className="flex items-center gap-2 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-primary-600">
                Inicio
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/servicios" className="hover:text-primary-600">
                Servicios
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-gray-900 font-medium">{service.title}</li>
          </ol>
        </nav>

        {/* Service header */}
        <div className="mb-10">
          <span className="text-6xl" aria-hidden="true">
            {service.icon}
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mt-4 mb-4">
            {service.title}
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            {service.fullDescription}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Features */}
          <div className="md:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              ¿Qué incluye este servicio?
            </h2>
            <ul className="space-y-3">
              {service.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 w-5 h-5 bg-accent-100 text-accent-700 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing + CTA sidebar */}
          <div className="bg-gray-50 rounded-2xl p-6 h-fit">
            <p className="text-3xl font-extrabold text-primary-700 mb-1">
              {service.price}
            </p>
            <p className="text-sm text-gray-500 mb-6">{service.priceNote}</p>
            <Link
              href={`/contacto?servicio=${service.id}`}
              className="block w-full text-center bg-primary-600 text-white hover:bg-primary-700 font-bold text-lg py-4 rounded-xl shadow-md transition-all mb-3"
            >
              Solicitar ahora
            </Link>
            <p className="text-xs text-center text-gray-500">
              Sin compromiso · Respuesta en 24h
            </p>
          </div>
        </div>

        {/* Other services */}
        <div className="mt-16 pt-8 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Otros servicios que podrían interesarte
          </h2>
          <div className="flex flex-wrap gap-3">
            {services
              .filter((s) => s.id !== service.id)
              .slice(0, 4)
              .map((s) => (
                <Link
                  key={s.id}
                  href={`/servicios/${s.slug}`}
                  className="flex items-center gap-2 bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50 text-gray-700 hover:text-primary-700 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                >
                  <span aria-hidden="true">{s.icon}</span>
                  {s.title}
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
