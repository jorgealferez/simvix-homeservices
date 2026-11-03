import type { Metadata } from 'next';
import { FichaTitular, LegalPage } from '@/components/LegalPage';
import { TITULAR } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Cómo trata Simvix Home Services los datos de las familias y de las profesionales que nos escriben.',
  alternates: { canonical: '/privacidad' },
};

export default function PrivacidadPage() {
  return (
    <LegalPage titulo="Política de privacidad" actualizado="3 de noviembre de 2026">
      <h2>1. Responsable del tratamiento</h2>
      <FichaTitular />
      <p>Para cualquier cuestión sobre tus datos: {TITULAR.email}.</p>

      <h2>2. Qué datos tratamos y para qué</h2>
      <ul>
        <li>
          <strong>Familias que solicitan un servicio</strong>: nombre, email, teléfono, municipio,
          servicio y lo que nos cuentes, para responderte, preparar el presupuesto y, si contratas,
          prestar el servicio y facturarlo.
        </li>
        <li>
          <strong>Profesionales que se apuntan</strong>: los mismos datos, para valorar tu
          candidatura y contactarte para una entrevista.
        </li>
        <li>
          <strong>Origen</strong>: el anuncio o la publicación de la que vienes (por ejemplo
          «facebook»), para saber qué canales funcionan. No usamos cookies para ello.
        </li>
      </ul>

      <h2>3. Base legal</h2>
      <p>
        Tu consentimiento, que das al enviar el formulario (art. 6.1.a RGPD), y, si contratas o te
        contratamos, la ejecución del contrato (art. 6.1.b) y las obligaciones legales fiscales y
        laborales (art. 6.1.c).
      </p>

      <h2>4. Cuánto tiempo los guardamos</h2>
      <ul>
        <li>Solicitudes que no llegan a contratarse y candidaturas no seleccionadas: 12 meses.</li>
        <li>Clientes y plantilla: mientras dure la relación y, después, los plazos que exige la ley (fiscales, laborales y de Seguridad Social).</li>
      </ul>

      <h2>5. Destinatarios</h2>
      <p>
        No cedemos tus datos a terceros salvo obligación legal. Los tratan por cuenta nuestra
        proveedores de alojamiento con contrato de encargo de tratamiento. Si eres profesional y te
        asignamos un servicio, la familia recibe tu nombre de pila; si eres familia, la profesional
        recibe tu nombre y la dirección del servicio.
      </p>

      <h2>6. Seguridad</h2>
      <p>
        Nombre, email, teléfono y mensaje se guardan cifrados en nuestra base de datos y no se
        escriben en los registros de la aplicación.
      </p>

      <h2>7. Tus derechos</h2>
      <p>
        Puedes pedir acceso, rectificación, supresión, oposición, limitación y portabilidad, y
        retirar tu consentimiento en cualquier momento, escribiendo a {TITULAR.email}. Si no te
        atendemos como corresponde, puedes reclamar ante la Agencia Española de Protección de Datos
        (www.aepd.es).
      </p>
    </LegalPage>
  );
}
