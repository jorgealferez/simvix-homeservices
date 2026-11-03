import type { Metadata } from 'next';
import Link from 'next/link';
import { FichaTitular, LegalPage } from '@/components/LegalPage';
import { CONTACT, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Aviso legal',
  description: 'Aviso legal de Simvix Home Services: titular de la web, condiciones de uso y legislación aplicable.',
  alternates: { canonical: '/aviso-legal' },
};

export default function AvisoLegalPage() {
  return (
    <LegalPage titulo="Aviso legal" actualizado="3 de noviembre de 2026">
      <h2>1. Titular de la web</h2>
      <p>
        En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la
        información y de comercio electrónico (LSSI), se informa de que {SITE_URL} es titularidad de:
      </p>
      <FichaTitular />
      <p>Contacto: {CONTACT.email} · {CONTACT.telefono}.</p>

      <h2>2. Objeto</h2>
      <p>
        Esta web informa sobre los servicios del hogar de Simvix Home Services (limpieza, cuidado de
        niños y mayores, recados) y permite solicitarlos o presentar una candidatura de empleo.
        Las condiciones de contratación están en las <Link href="/condiciones" className="underline">condiciones del servicio</Link>.
      </p>

      <h2>3. Uso de la web</h2>
      <p>
        Quien navega se compromete a usar la web conforme a la ley y a no introducir datos falsos o
        de terceros sin su autorización. Los contenidos, la marca y el diseño son propiedad del
        titular o de sus licenciantes; no se pueden reproducir con fines comerciales sin permiso.
      </p>

      <h2>4. Responsabilidad</h2>
      <p>
        El titular procura que la información sea exacta y esté actualizada, pero los precios y la
        disponibilidad por zona pueden cambiar; lo que vale es lo confirmado al contratar. No
        responde de los contenidos de webs de terceros enlazadas.
      </p>

      <h2>5. Datos personales y cookies</h2>
      <p>
        El tratamiento de datos se explica en la <Link href="/privacidad" className="underline">política de privacidad</Link>.
        Esta web no instala cookies de analítica ni de publicidad.
      </p>

      <h2>6. Legislación y jurisdicción</h2>
      <p>
        Se aplica la legislación española. Para consumidores, son competentes los juzgados de su
        domicilio; en los demás casos, los del domicilio del titular.
      </p>
    </LegalPage>
  );
}
