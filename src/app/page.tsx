import type { Metadata } from 'next';
import Hero from '@/components/Hero';
import Services from '@/components/Services';
import ContactForm from '@/components/ContactForm';

export const metadata: Metadata = {
  title: {
    absolute: 'Limpieza del hogar por horas con contrato | Simvix Home Services',
  },
  description:
    'Limpiadoras por horas verificadas, con contrato, alta en la Seguridad Social, factura y sustitución garantizada. Parla y sur de Madrid. Respuesta en 24 h.',
  alternates: {
    canonical: '/',
  },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Services />
      <ContactForm />
    </>
  );
}
