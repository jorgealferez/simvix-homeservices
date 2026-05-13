import type { Metadata } from 'next';
import ContactForm from '@/components/ContactForm';

export const metadata: Metadata = {
  title: 'Contacto — Solicita tu Servicio',
  description:
    'Contacta con Simvix Home Services para solicitar recogida de niños, limpieza del hogar, niñera, hacer la compra o cuidado de personas mayores. Respuesta en menos de 24 horas.',
  alternates: {
    canonical: 'https://homeservices.simvix.com/contacto',
  },
};

export default function ContactoPage() {
  return (
    <div className="py-8">
      <ContactForm />

      {/* Trust signals */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div className="p-6">
              <div className="text-4xl mb-3" aria-hidden="true">
                📞
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Llámanos</h3>
              <a
                href="tel:+34900000000"
                className="text-primary-600 hover:text-primary-800 font-medium"
              >
                +34 900 000 000
              </a>
            </div>
            <div className="p-6">
              <div className="text-4xl mb-3" aria-hidden="true">
                📧
              </div>
              <h3 className="font-bold text-gray-900 mb-1">
                Escríbenos
              </h3>
              <a
                href="mailto:hola@simvix.com"
                className="text-primary-600 hover:text-primary-800 font-medium"
              >
                hola@simvix.com
              </a>
            </div>
            <div className="p-6">
              <div className="text-4xl mb-3" aria-hidden="true">
                ⏰
              </div>
              <h3 className="font-bold text-gray-900 mb-1">
                Horario de atención
              </h3>
              <p className="text-gray-600 text-sm">
                Lunes a viernes 8:00–20:00
                <br />
                Sábados 9:00–14:00
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
