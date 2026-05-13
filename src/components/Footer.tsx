import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-white mb-4">Contacto</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span aria-hidden="true">📞</span>
                <a
                  href="tel:+34900000000"
                  className="hover:text-white transition-colors"
                >
                  +34 900 000 000
                </a>
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden="true">📧</span>
                <a
                  href="mailto:hola@simvix.com"
                  className="hover:text-white transition-colors"
                >
                  hola@simvix.com
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
          <p>© {currentYear} Simvix Home Services. Todos los derechos reservados.</p>
          <p>Servicios del hogar profesionales en España</p>
        </div>
      </div>
    </footer>
  );
}
