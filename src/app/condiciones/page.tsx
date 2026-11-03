import type { Metadata } from 'next';
import Link from 'next/link';
import { FichaTitular, LegalPage } from '@/components/LegalPage';
import { CONTACT } from '@/lib/site';
import { PRECIO_HORA_LIMPIEZA } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Condiciones del servicio',
  description: `Condiciones de contratación de Simvix Home Services: precio (${PRECIO_HORA_LIMPIEZA} €/h IVA incluido en limpieza), cancelación, sustitución y garantía.`,
  alternates: { canonical: '/condiciones' },
};

export default function CondicionesPage() {
  return (
    <LegalPage titulo="Condiciones del servicio" actualizado="3 de noviembre de 2026">
      <h2>1. Quién presta el servicio</h2>
      <FichaTitular />
      <p>
        Las profesionales que hacen el servicio tienen contrato laboral con el titular y alta en la
        Seguridad Social. La familia contrata un servicio y recibe una factura; no asume
        obligaciones de empleadora.
      </p>

      <h2>2. Precio y pago</h2>
      <ul>
        <li>Limpieza del hogar: {PRECIO_HORA_LIMPIEZA} € por hora, IVA incluido.</li>
        <li>Resto de servicios: el precio publicado en su página o el del presupuesto aceptado.</li>
        <li>Se facturan las horas realizadas. La factura se emite a mes vencido.</li>
      </ul>

      <h2>3. Cómo se contrata</h2>
      <p>
        Tras tu solicitud te llamamos, acordamos horario y te confirmamos por escrito (email o
        WhatsApp) el servicio, el precio y la profesional asignada. El contrato se perfecciona con
        esa confirmación.
      </p>

      <h2>4. Cancelación y permanencia</h2>
      <ul>
        <li>No hay permanencia.</li>
        <li>Puedes cancelar o mover un servicio avisando con 24 horas de antelación sin coste.</li>
        <li>
          Derecho de desistimiento: si contratas a distancia, tienes 14 días naturales para desistir
          sin dar explicaciones. Si pides expresamente que el servicio empiece antes y se presta por
          completo, pierdes ese derecho sobre el servicio ya prestado; si está a medias, pagas la
          parte realizada.
        </li>
      </ul>

      <h2>5. Nuestro compromiso</h2>
      <ul>
        <li>Si la profesional no puede ir, enviamos a otra de tu zona.</li>
        <li>Si el servicio no ha quedado bien, lo repasamos sin coste si nos avisas en 48 horas.</li>
        <li>Seguro de responsabilidad civil para los daños que se causen durante el servicio.</li>
        <li>En servicios regulares repite la misma persona, salvo que pidas un cambio.</li>
      </ul>

      <h2>6. Lo que pedimos a la familia</h2>
      <ul>
        <li>Facilitar el acceso a la vivienda y los productos y útiles habituales, o pedir que los llevemos.</li>
        <li>Un trato respetuoso. Ante un trato inadecuado podemos retirar a la profesional y terminar el servicio.</li>
      </ul>

      <h2>7. Reclamaciones</h2>
      <p>
        Escríbenos a {CONTACT.email} o llama al {CONTACT.telefono}. Tienes a tu disposición hojas de
        reclamaciones. Datos personales: <Link href="/privacidad" className="underline">política de privacidad</Link>.
      </p>
    </LegalPage>
  );
}
