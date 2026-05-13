import Link from 'next/link';

export default function Hero() {
  return (
    <section className="bg-gradient-to-br from-primary-700 via-primary-600 to-accent-600 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="max-w-3xl">
          {/* Badge */}
          <span className="inline-block bg-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            🏡 Servicios domésticos de confianza
          </span>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
            Tu hogar en{' '}
            <span className="text-accent-300">las mejores manos</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-white/90 leading-relaxed mb-8 max-w-2xl">
            Recogida de niños, limpieza, niñera, hacer la compra y cuidado de
            mayores. Servicios domésticos profesionales para recuperar tu tiempo
            libre.
          </p>

          {/* Key benefits */}
          <ul className="flex flex-wrap gap-4 mb-10">
            {[
              '✓ Personal verificado',
              '✓ Sin permanencia',
              '✓ Disponible 7 días',
              '✓ Respuesta en 24h',
            ].map((benefit) => (
              <li
                key={benefit}
                className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium"
              >
                {benefit}
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/contacto"
              className="inline-flex items-center justify-center gap-2 bg-white text-primary-700 hover:bg-primary-50 font-bold text-lg px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Solicitar servicio hoy
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/servicios"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/70 text-white hover:bg-white/10 font-semibold text-lg px-8 py-4 rounded-xl transition-all"
            >
              Ver todos los servicios
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { value: '+500', label: 'Familias atendidas' },
            { value: '+50', label: 'Profesionales verificados' },
            { value: '6', label: 'Tipos de servicio' },
            { value: '4.9★', label: 'Valoración media' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-extrabold text-white">{stat.value}</p>
              <p className="text-white/70 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
