import type { Metadata, Viewport } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import JsonLd from '@/components/JsonLd';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: 'Simvix Home Services | Limpieza del hogar con contrato en Parla y sur de Madrid',
    template: '%s | Simvix Home Services',
  },
  description:
    'Limpiadoras por horas con contrato, alta en la Seguridad Social y factura en Parla, Pinto, Fuenlabrada, Getafe y el sur de Madrid. También niñera, recogida del colegio y cuidado de mayores.',
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
    url: '/',
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
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/brand/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#0B1220',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-accent-600 text-white px-4 py-2 rounded-lg"
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
