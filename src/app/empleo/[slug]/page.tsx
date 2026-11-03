import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import { OG_IMAGE } from '@/lib/site';
import FaqList from '@/components/FaqList';
import { getZona, ofertaEmpleo, vecinasDe, zonas } from '@/lib/zonas';
import { breadcrumbJsonLd, faqJsonLd, faqsEmpleo, jobPostingJsonLd } from '@/lib/seo';

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
  const title = `Trabajo de empleada del hogar en ${zona.nombre}, con contrato y alta`;
  const description = `Trabaja limpiando casas en ${zona.nombre} con contrato laboral, alta en la Seguridad Social y nómina. Servicios cerca de casa, en las franjas que elijas. Apuntarte es gratis.`;
  return {
    title,
    description,
    alternates: { canonical: `/empleo/${zona.slug}` },
    openGraph: { title, description, url: `/empleo/${zona.slug}`, type: 'website', images: [OG_IMAGE] },
  };
}

export default async function EmpleoZonaPage({ params }: PageProps) {
  const { slug } = await params;
  const zona = getZona(slug);
  if (!zona) notFound();

  const faqs = faqsEmpleo(zona);
  const vecinas = vecinasDe(zona);
  const apuntarse = `/contacto?rol=profesional&zona=${zona.slug}&servicio=limpieza-hogar`;

  return (
    <div className="py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <JsonLd
          data={[
            jobPostingJsonLd(zona),
            faqJsonLd(faqs),
            breadcrumbJsonLd([
              { nombre: 'Inicio', path: '/' },
              { nombre: 'Trabaja con nosotros', path: '/empleo' },
              { nombre: zona.nombre, path: `/empleo/${zona.slug}` },
            ]),
          ]}
        />

        <nav aria-label="Ruta de navegación" className="mb-8">
          <ol className="flex items-center gap-2 text-sm text-gray-500">
            <li><Link href="/" className="hover:text-accent-600">Inicio</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/empleo" className="hover:text-accent-600">Trabaja con nosotros</Link></li>
            <li aria-hidden="true">/</li>
            <li className="text-gray-900 font-medium">{zona.nombre}</li>
          </ol>
        </nav>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
          Trabajo de limpieza del hogar en {zona.nombre}
        </h1>
        <p className="text-xl text-gray-700 leading-relaxed mb-8">
          Si ya limpias casas en {zona.nombre}, hazlo con contrato: alta en la Seguridad Social
          desde el primer día, nómina, vacaciones y servicios cerca de casa. Sin cuota de
          autónomos y sin pagar nada por apuntarte.
          {ofertaEmpleo.salarioHoraBrutoDesde !== null && (
            <> Desde <strong>{ofertaEmpleo.salarioHoraBrutoDesde} € brutos la hora</strong>.</>
          )}
        </p>

        <Link
          href={apuntarse}
          className="inline-flex justify-center bg-accent-600 hover:bg-accent-700 text-white font-bold text-lg px-8 py-4 rounded-xl shadow-md mb-12"
        >
          Quiero trabajar en {zona.nombre}
        </Link>

        <section aria-labelledby="ofrecemos" className="mb-10">
          <h2 id="ofrecemos" className="text-2xl font-bold text-gray-900 mb-4">Qué te ofrecemos</h2>
          <ul className="space-y-2 list-disc pl-6 text-gray-700">
            {ofertaEmpleo.condiciones.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </section>

        <section aria-labelledby="pedimos">
          <h2 id="pedimos" className="text-2xl font-bold text-gray-900 mb-4">Qué pedimos</h2>
          <ul className="space-y-2 list-disc pl-6 text-gray-700">
            {ofertaEmpleo.requisitos.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </section>

        {vecinas.length > 0 && (
          <p className="text-gray-700 mt-10">
            También buscamos en:{' '}
            {vecinas.map((v, i) => (
              <span key={v.slug}>
                <Link href={`/empleo/${v.slug}`} className="text-primary-700 underline">{v.nombre}</Link>
                {i < vecinas.length - 1 ? ', ' : '.'}
              </span>
            ))}
          </p>
        )}

        <FaqList faqs={faqs} />
      </div>
    </div>
  );
}
