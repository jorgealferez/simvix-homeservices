import Link from 'next/link';
import { zonas } from '@/lib/zonas';
import { CONTACT, TITULAR } from '@/lib/site';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🏡</span>
              <span className="font-bold text-xl text-white">
                Simvix<span className="text-accent-400"> Home</span>
              </span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Servicios del hogar profesionales y de confianza. Cuidamos de lo
              que más importa: tu familia y tu hogar.
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-white mb-4">Servicios</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/servicios/recogida-ninos"
                  className="hover:text-white transition-colors"
                >
                  Recogida de Niños
                </Link>
              </li>
              <li>
                <Link
                  href="/servicios/limpieza-hogar"
                  className="hover:text-white transition-colors"
                >
                  Limpieza del Hogar
                </Link>
              </li>
              <li>
                <Link
                  href="/servicios/ninera"
                  className="hover:text-white transition-colors"
                >
                  Niñera y Cuidado de Niños
                </Link>
              </li>
              <li>
                <Link
                  href="/servicios/hacer-la-compra"
                  className="hover:text-white transition-colors"
                >
                  Hacer la Compra
                </Link>
              </li>
              <li>
                <Link
                  href="/servicios/cuidado-mayores"
                  className="hover:text-white transition-colors"
                >
                  Cuidado de Mayores
                </Link>
              </li>
              <li>
                <Link
                  href="/servicios/otros-servicios"
                  className="hover:text-white transition-colors"
                >
                  Otros Servicios
                </Link>
              </li>
            </ul>
          </div>

          {/* Zonas: enlazado interno hacia las páginas locales */}
          <div>
            <h3 className="font-semibold text-white mb-4">Zonas</h3>
            <ul className="space-y-2 text-sm">
              {zonas.map((z) => (
                <li key={z.slug}>
                  <Link href={`/zonas/${z.slug}`} className="hover:text-white transition-colors">
                    Limpieza en {z.nombre}
                  </Link>
                </li>
              ))}
              <li className="pt-2">
                <Link href="/empleo" className="hover:text-white transition-colors">
                  Trabaja con nosotros
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-white mb-4">Contacto</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span aria-hidden="true">📞</span>
                <a
                  href={`tel:${CONTACT.telefono.replace(/\s+/g, '')}`}
                  className="hover:text-white transition-colors"
                >
                  {CONTACT.telefono}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden="true">📧</span>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="hover:text-white transition-colors"
                >
                  {CONTACT.email}
                </a>
              </li>
              <li className="mt-4">
                <Link
                  href="/contacto"
                  className="inline-block bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  Solicitar Servicio
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-gray-500 flex flex-col sm:flex-row justify-between gap-2">
          <p>© {currentYear} Simvix Home Services · {TITULAR.razonSocial}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/aviso-legal" className="hover:text-white">Aviso legal</Link>
            <Link href="/privacidad" className="hover:text-white">Privacidad</Link>
            <Link href="/condiciones" className="hover:text-white">Condiciones</Link>
          </p>
          <p>Limpieza del hogar con contrato en Parla y el sur de Madrid</p>
        </div>
      </div>
    </footer>
  );
}
