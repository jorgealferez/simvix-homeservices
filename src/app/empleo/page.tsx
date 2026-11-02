import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import { ofertaEmpleo, zonas } from '@/lib/zonas';
import { breadcrumbJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Trabaja con nosotros: empleo de limpieza del hogar con contrato',
  description:
    'Buscamos profesionales de la limpieza del hogar en Parla y el sur de Madrid. Contrato laboral, alta en la Seguridad Social, nómina y servicios cerca de casa. Apuntarte es gratis.',
  alternates: { canonical: '/empleo' },
};

export default function EmpleoPage() {
  return (
    <div className="py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <JsonLd
          data={breadcrumbJsonLd([
            { nombre: 'Inicio', path: '/' },
            { nombre: 'Trabaja con nosotros', path: '/empleo' },
          ])}
        />
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
          Trabaja con contrato, cerca de casa
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          Si limpias casas por horas, con Simvix lo haces con alta en la Seguridad Social, nómina y
          vacaciones. Tú eliges las franjas; nosotros buscamos las familias y gestionamos todo el
          papeleo. Nunca cobramos nada a las profesionales.
        </p>
        <ul className="space-y-2 list-disc pl-6 text-gray-700 mb-10">
          {ofertaEmpleo.condiciones.map((c) => <li key={c}>{c}</li>)}
        </ul>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Elige tu municipio</h2>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
          {zonas.map((z) => (
            <li key={z.slug}>
              <Link
                href={`/empleo/${z.slug}`}
                className="block border border-gray-200 rounded-lg px-4 py-3 hover:border-primary-300 hover:bg-primary-50 font-medium text-gray-800"
              >
                {z.nombre}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/contacto?rol=profesional&servicio=limpieza-hogar"
          className="inline-flex bg-primary-600 hover:bg-primary-700 text-white font-bold text-lg px-8 py-4 rounded-xl shadow-md"
        >
          Apuntarme
        </Link>
      </div>
    </div>
  );
}
