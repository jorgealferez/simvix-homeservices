import type { Faq } from '@/lib/seo';

/** Preguntas frecuentes visibles (lo que se marca en FAQPage tiene que verse en la página). */
export default function FaqList({ faqs, titulo = 'Preguntas frecuentes' }: { faqs: Faq[]; titulo?: string }) {
  return (
    <section aria-labelledby="faq-heading" className="mt-16">
      <h2 id="faq-heading" className="text-2xl font-bold text-gray-900 mb-6">
        {titulo}
      </h2>
      <dl className="space-y-6">
        {faqs.map((f) => (
          <div key={f.pregunta} className="bg-gray-50 rounded-xl p-5">
            <dt className="font-semibold text-gray-900">{f.pregunta}</dt>
            <dd className="mt-2 text-gray-700 leading-relaxed">{f.respuesta}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
