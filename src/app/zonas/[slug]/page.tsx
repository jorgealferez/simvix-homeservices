import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import { OG_IMAGE } from '@/lib/site';
import FaqList from '@/components/FaqList';
import { ETIQUETA_PRIORIDAD, getZona, vecinasDe, zonas } from '@/lib/zonas';
import {
  PRECIO_HORA_LIMPIEZA,
  breadcrumbJsonLd,
  faqJsonLd,
  faqsZona,
  zonaServiceJsonLd,
} from '@/lib/seo';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return zonas.map((z) => ({ slug: z.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const zona = getZona(slug);
  if (!zona) return {};
  const title = `Limpieza del hogar en ${zona.nombre} por horas, con contrato y factura`;
  const description = `Limpiadoras por horas en ${zona.nombre} verificadas, con alta en la Seguridad Social, factura y garantía de sustitución. ${PRECIO_HORA_LIMPIEZA} €/h IVA incluido. Respuesta en 24 h.`;
  return {
    title,
    description,
    alternates: { canonical: `/zonas/${zona.slug}` },
    openGraph: { title, description, url: `/zonas/${zona.slug}`, type: 'website', images: [OG_IMAGE] },
  };
}

export default async function ZonaPage({ params }: PageProps) {
  const { slug } = await params;
  const zona = getZona(slug);
  if (!zona) notFound();

  const faqs = faqsZona(zona);
  const vecinas = vecinasDe(zona);
  const pedir = `/contacto?servicio=limpieza-hogar&zona=${zona.slug}&rol=familia`;

  return (
    <div className="py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <JsonLd
          data={[
            zonaServiceJsonLd(zona),
            faqJsonLd(faqs),
            breadcrumbJsonLd([
              { nombre: 'Inicio', path: '/' },
              { nombre: 'Zonas', path: '/zonas' },
              { nombre: zona.nombre, path: `/zonas/${zona.slug}` },
            ]),
          ]}
        />

        <nav aria-label="Ruta de navegación" className="mb-8">
          <ol className="flex items-center gap-2 text-sm text-gray-500">
            <li><Link href="/" className="hover:text-primary-600">Inicio</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/zonas" className="hover:text-primary-600">Zonas</Link></li>
            <li aria-hidden="true">/</li>
            <li className="text-gray-900 font-medium">{zona.nombre}</li>
          </ol>
        </nav>

        <span className="inline-block bg-accent-100 text-accent-700 text-sm font-semibold px-3 py-1 rounded-full mb-4">
          {ETIQUETA_PRIORIDAD[zona.prioridad]}
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
          Limpieza del hogar en {zona.nombre}
        </h1>
        {/* Respuesta directa primero: es lo que citan los buscadores generativos. */}
        <p className="text-xl text-gray-700 leading-relaxed mb-4">
          Limpiadoras por horas en {zona.nombre} con contrato, alta en la Seguridad Social y
          factura, por <strong>{PRECIO_HORA_LIMPIEZA} € la hora, IVA incluido</strong>. Pides en
          dos minutos, te llamamos en menos de 24 horas y te asignamos una profesional verificada
          que vive cerca.
        </p>
        <p className="text-gray-600 leading-relaxed mb-8">{zona.contexto}</p>

        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <Link
            href={pedir}
            className="inline-flex justify-center bg-primary-600 hover:bg-primary-700 text-white font-bold text-lg px-8 py-4 rounded-xl shadow-md"
          >
            Pedir limpieza en {zona.nombre}
          </Link>
          <Link
            href="/como-funciona"
            className="inline-flex justify-center border-2 border-primary-600 text-primary-700 font-semibold text-lg px-8 py-4 rounded-xl hover:bg-primary-50"
          >
            Cómo funciona
          </Link>
        </div>

        <section aria-labelledby="incluye" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <h2 id="incluye" className="sr-only">Qué incluye</h2>
          {[
            ['Con contrato y alta', 'La profesional trabaja para Simvix con contrato laboral. Tú no haces altas, nóminas ni cotizaciones.'],
            ['Factura a tu nombre', 'Cada mes recibes una factura con las horas realizadas.'],
            ['Sustitución garantizada', 'Si tu profesional no puede ir, enviamos a otra de la zona.'],
            ['Siempre la misma persona', 'En servicios regulares repite la misma profesional, salvo que pidas un cambio.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-gray-50 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 mb-1">{t}</h3>
              <p className="text-gray-700 text-sm leading-relaxed">{d}</p>
            </div>
          ))}
        </section>

        <section aria-labelledby="cobertura" className="mt-12">
          <h2 id="cobertura" className="text-2xl font-bold text-gray-900 mb-4">
            Cobertura en {zona.nombre}
          </h2>
          <p className="text-gray-700 mb-2">
            Códigos postales: {zona.codigosPostales.join(', ')}.
          </p>
          {zona.barrios.length > 0 && (
            <p className="text-gray-700">Barrios: {zona.barrios.join(', ')} y el resto del municipio.</p>
          )}
          {vecinas.length > 0 && (
            <p className="text-gray-700 mt-4">
              El mismo equipo cubre:{' '}
              {vecinas.map((v, i) => (
                <span key={v.slug}>
                  <Link href={`/zonas/${v.slug}`} className="text-primary-700 underline hover:text-primary-900">
                    limpieza en {v.nombre}
                  </Link>
                  {i < vecinas.length - 1 ? ', ' : '.'}
                </span>
              ))}
            </p>
          )}
        </section>

        <FaqList faqs={faqs} titulo={`Preguntas frecuentes sobre limpieza en ${zona.nombre}`} />

        <aside className="mt-16 bg-primary-50 border border-primary-100 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">¿Trabajas limpiando casas en {zona.nombre}?</h2>
          <p className="text-gray-700 mb-4">
            Te ofrecemos contrato, alta en la Seguridad Social y servicios cerca de casa.
          </p>
          <Link href={`/empleo/${zona.slug}`} className="text-primary-700 font-semibold underline">
            Ver la oferta de empleo en {zona.nombre} →
          </Link>
        </aside>
      </div>
    </div>
  );
}
