import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import { ETIQUETA_PRIORIDAD, zonas } from '@/lib/zonas';
import { PRECIO_HORA_LIMPIEZA, breadcrumbJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Zonas: limpieza del hogar en Parla y el sur de Madrid',
  description: `Limpiadoras por horas con contrato y factura en Parla, Pinto, Fuenlabrada, Getafe, Leganés, Humanes, Valdemoro, Móstoles y Alcorcón. ${PRECIO_HORA_LIMPIEZA} €/h IVA incluido.`,
  alternates: { canonical: '/zonas' },
};

export default function ZonasPage() {
  return (
    <div className="py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <JsonLd
          data={breadcrumbJsonLd([
            { nombre: 'Inicio', path: '/' },
            { nombre: 'Zonas', path: '/zonas' },
          ])}
        />
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
          Dónde trabajamos
        </h1>
        <p className="text-xl text-gray-700 mb-10 max-w-3xl">
          Empezamos en Parla y crecemos por los municipios de al lado, para que cada profesional
          trabaje cerca de casa y la sustitución sea rápida. Elige tu municipio.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {zonas.map((z) => (
            <li key={z.slug} className="border border-gray-200 rounded-xl p-5 hover:border-accent-500">
              <span className="text-xs font-semibold text-accent-700">{ETIQUETA_PRIORIDAD[z.prioridad]}</span>
              <h2 className="text-lg font-bold text-gray-900 mt-1">{z.nombre}</h2>
              <p className="text-sm text-gray-500 mb-3">CP {z.codigosPostales.join(', ')}</p>
              <div className="flex flex-col gap-1 text-sm">
                <Link href={`/zonas/${z.slug}`} className="text-primary-700 font-semibold hover:underline">
                  Limpieza en {z.nombre} →
                </Link>
                <Link href={`/empleo/${z.slug}`} className="text-gray-600 hover:underline">
                  Trabajo de limpieza en {z.nombre} →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
