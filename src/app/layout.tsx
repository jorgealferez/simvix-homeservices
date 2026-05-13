import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://homeservices.simvix.com'
  ),
  title: {
    default: 'Simvix Home Services | Servicios del Hogar de Confianza',
    template: '%s | Simvix Home Services',
  },
  description:
    'Recogida de niños del colegio, limpieza del hogar, niñera, hacer la compra y cuidado de personas mayores. Servicios domésticos profesionales y de confianza en España.',
  keywords: [
    'servicios del hogar',
    'recogida niños colegio',
    'limpieza hogar profesional',
    'niñera',
    'cuidado mayores domicilio',
    'hacer la compra',
    'servicios domésticos',
    'asistente hogar',
    'canguro niños',
    'cuidadora infantil',
  ],
  authors: [{ name: 'Simvix Home Services' }],
  creator: 'Simvix',
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://homeservices.simvix.com',
    siteName: 'Simvix Home Services',
    title: 'Simvix Home Services | Servicios del Hogar de Confianza',
    description:
      'Recogida de niños, limpieza, niñera, compra y cuidado de mayores. Servicios domésticos profesionales.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Simvix Home Services | Servicios del Hogar de Confianza',
    description:
      'Recogida de niños, limpieza, niñera, compra y cuidado de mayores. Servicios domésticos profesionales.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://homeservices.simvix.com',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-primary-600 text-white px-4 py-2 rounded-lg"
        >
          Saltar al contenido principal
        </a>
        <Header />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
