import type { Metadata } from 'next';
import Hero from '@/components/Hero';
import Services from '@/components/Services';
import ContactForm from '@/components/ContactForm';

export const metadata: Metadata = {
  title: 'Servicios del Hogar Profesionales | Simvix Home Services',
  description:
    'Descubre todos nuestros servicios domésticos: recogida de niños, limpieza del hogar, niñera, hacer la compra y cuidado de personas mayores. Solicita tu servicio hoy.',
  alternates: {
    canonical: 'https://homeservices.simvix.com',
  },
};

export default function HomePage() {
  return (
    <>
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: 'Simvix Home Services',
            description:
              'Servicios del hogar profesionales: recogida de niños, limpieza, niñera, compra y cuidado de mayores.',
            url: 'https://homeservices.simvix.com',
            telephone: '+34-900-000-000',
            email: 'hola@simvix.com',
            areaServed: 'ES',
            serviceType: 'Servicios domésticos',
            priceRange: '€€',
          }),
        }}
      />
      <Hero />
      <Services />
      <ContactForm />
    </>
  );
}
