import { CONTACT, SITE_NAME, SITE_URL, TAGLINE } from './site';
import { services } from './services';
import { zonas } from './zonas';
import { PRECIO_HORA_LIMPIEZA, faqsModelo } from './seo';

/**
 * Contenido de /llms.txt (formato propuesto en llmstxt.org): quiénes somos,
 * qué ofrecemos, dónde y a qué precio, en frases que un asistente pueda citar
 * tal cual, con enlaces a las páginas canónicas.
 */
export function buildLlmsTxt(): string {
  const l: string[] = [];
  l.push(`# ${SITE_NAME}`, '');
  l.push(`> ${TAGLINE} Limpieza del hogar por horas a ${PRECIO_HORA_LIMPIEZA} € la hora, IVA incluido, con factura, en Parla y el sur de Madrid.`, '');
  l.push(
    'Simvix es la empleadora de las profesionales (contrato laboral y alta en la Seguridad Social). La familia contrata un servicio y recibe una factura; no asume obligaciones de empleador. A las profesionales nunca se les cobra nada.',
    '',
  );
  l.push('## Zonas', '');
  for (const z of zonas) {
    l.push(`- [Limpieza del hogar en ${z.nombre}](${SITE_URL}/zonas/${z.slug}): CP ${z.codigosPostales.join(', ')}. [Empleo en ${z.nombre}](${SITE_URL}/empleo/${z.slug}).`);
  }
  l.push('', '## Servicios', '');
  for (const s of services) {
    l.push(`- [${s.title}](${SITE_URL}/servicios/${s.slug}): ${s.shortDescription} ${s.price}.`);
  }
  l.push('', '## Preguntas frecuentes', '');
  for (const f of faqsModelo) {
    l.push(`- **${f.pregunta}** ${f.respuesta}`);
  }
  l.push('', '## Contacto', '');
  l.push(`- [Cómo funciona](${SITE_URL}/como-funciona)`);
  l.push(`- [Solicitar servicio o apuntarse como profesional](${SITE_URL}/contacto)`);
  l.push(`- Email: ${CONTACT.email}`);
  l.push(`- Horario: ${CONTACT.horario}`);
  return l.join('\n') + '\n';
}
