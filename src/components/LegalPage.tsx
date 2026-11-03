import { TITULAR } from '@/lib/site';

/** Envoltorio común de las páginas legales y ficha del titular. */
export function LegalPage({ titulo, actualizado, children }: { titulo: string; actualizado: string; children: React.ReactNode }) {
  return (
    <div className="py-16">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-gray-700 leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-10 [&_h2]:mb-3 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">{titulo}</h1>
        <p className="text-sm text-gray-500 mb-8">Última actualización: {actualizado}</p>
        {children}
      </article>
    </div>
  );
}

export function FichaTitular() {
  return (
    <ul>
      <li>Titular: {TITULAR.razonSocial} (marca comercial {TITULAR.marca})</li>
      <li>CIF: {TITULAR.cif}</li>
      <li>Domicilio social: {TITULAR.domicilio}</li>
      {TITULAR.registroMercantil && <li>Datos registrales: {TITULAR.registroMercantil}</li>}
    </ul>
  );
}
