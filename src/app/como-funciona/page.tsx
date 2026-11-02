import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import FaqList from '@/components/FaqList';
import { TAGLINE } from '@/lib/site';
import { PRECIO_HORA_LIMPIEZA, breadcrumbJsonLd, faqJsonLd, faqsModelo } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Cómo funciona: limpieza por horas con contrato, sin papeleo para ti',
  description: `${TAGLINE} ${PRECIO_HORA_LIMPIEZA} €/h IVA incluido, con factura y sin permanencia.`,
  alternates: { canonical: '/como-funciona' },
};

const pasos = [
  {
    t: '1. Pides en dos minutos',
    d: 'Dinos tu municipio, cuántas horas y cada cuánto. Por la web o por WhatsApp.',
  },
  {
    t: '2. Te asignamos a alguien de tu zona',
    d: 'Elegimos una profesional verificada que vive cerca y encaja con tu horario. Te llamamos en menos de 24 horas para confirmarlo.',
  },
  {
    t: '3. Ella limpia, nosotros respondemos',
    d: 'Si un día no puede, enviamos sustituta. Si algo no queda bien, lo repasamos sin coste. Si quieres cambiar de persona, se cambia.',
  },
  {
    t: '4. Una factura al mes',
    d: 'Pagas solo las horas hechas. Sin altas, nóminas ni cotizaciones a tu cargo.',
  },
];

const compromisos = [
  ['Para las familias', [
    'Profesional verificada: entrevista, identidad, permiso de trabajo, referencias y prueba pagada',
    'Sustitución si la profesional no puede ir',
    'Repaso sin coste si el servicio no queda bien (48 h)',
    'Seguro de responsabilidad civil',
    'Precio cerrado por hora, IVA incluido, con factura',
    'Sin permanencia: cancelas avisando con 24 h',
  ]],
  ['Para las profesionales', [
    'Contrato laboral y alta en la Seguridad Social desde el primer día',
    'Nómina, vacaciones, horas extra y festivos pagados',
    'Servicios cerca de casa, en las franjas que tú eliges',
    'Formación en prevención de riesgos, a cargo de la empresa',
    'Reasignación si una familia no te trata con respeto',
    'Nunca te cobramos por apuntarte ni por trabajar',
  ]],
] as const;

export default function ComoFuncionaPage() {
  return (
    <div className="py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <JsonLd
          data={[
            faqJsonLd(faqsModelo),
            breadcrumbJsonLd([
              { nombre: 'Inicio', path: '/' },
              { nombre: 'Cómo funciona', path: '/como-funciona' },
            ]),
          ]}
        />
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
          Cómo funciona
        </h1>
        <p className="text-xl text-gray-700 leading-relaxed mb-12">
          {TAGLINE} Tú solo pides; de encontrar a la persona, darla de alta y responder si algo
          falla nos encargamos nosotros.
        </p>

        <ol className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {pasos.map((p) => (
            <li key={p.t} className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-2">{p.t}</h2>
              <p className="text-gray-700">{p.d}</p>
            </li>
          ))}
        </ol>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">Nuestro compromiso, por escrito</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {compromisos.map(([titulo, lista]) => (
            <section key={titulo} className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-3">{titulo}</h3>
              <ul className="space-y-2 list-disc pl-5 text-gray-700 text-sm">
                {lista.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </section>
          ))}
        </div>

        <FaqList faqs={faqsModelo} />

        <div className="mt-12 flex flex-col sm:flex-row gap-4">
          <Link
            href="/zonas"
            className="inline-flex justify-center bg-primary-600 hover:bg-primary-700 text-white font-bold text-lg px-8 py-4 rounded-xl shadow-md"
          >
            Busca tu municipio
          </Link>
          <Link
            href="/empleo"
            className="inline-flex justify-center border-2 border-primary-600 text-primary-700 font-semibold text-lg px-8 py-4 rounded-xl hover:bg-primary-50"
          >
            Quiero trabajar con vosotros
          </Link>
        </div>
      </div>
    </div>
  );
}
