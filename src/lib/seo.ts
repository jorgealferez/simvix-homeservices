/**
 * Datos estructurados (schema.org en JSON-LD) y preguntas frecuentes.
 *
 * SEO: Google usa estos bloques para resultados enriquecidos (migas, FAQ,
 * ofertas de empleo en Google for Jobs). GEO: los motores generativos
 * (ChatGPT, Gemini, Perplexity, Claude, AI Overviews) citan mejor las páginas
 * que responden en frases cortas, con cifras y entidades claras; por eso las
 * FAQ se escriben como respuestas autocontenidas, y las mismas frases se
 * sirven en /llms.txt.
 */

import { CONTACT, SITE_NAME, SITE_URL, TAGLINE, absoluteUrl } from './site';
import { ofertaEmpleo, zonas, type Zona } from './zonas';

export type JsonLd = Record<string, unknown>;

export interface Faq {
  pregunta: string;
  respuesta: string;
}

const ORG_ID = `${SITE_URL}/#organizacion`;

export function organizationJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'HousekeepingService',
    '@id': ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    description: TAGLINE,
    telephone: CONTACT.telefono,
    email: CONTACT.email,
    priceRange: '€€',
    areaServed: zonas.map((z) => ({ '@type': 'City', name: z.nombre })),
    knowsLanguage: ['es'],
  };
}

export function websiteJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#web`,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'es-ES',
    publisher: { '@id': ORG_ID },
  };
}

export function breadcrumbJsonLd(items: { nombre: string; path: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.nombre,
      item: absoluteUrl(it.path),
    })),
  };
}

export function faqJsonLd(faqs: Faq[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.pregunta,
      acceptedAnswer: { '@type': 'Answer', text: f.respuesta },
    })),
  };
}

/** Servicio de limpieza del hogar prestado en una zona concreta. */
export function zonaServiceJsonLd(zona: Zona): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `Limpieza del hogar en ${zona.nombre}`,
    serviceType: 'Limpieza del hogar por horas',
    url: absoluteUrl(`/zonas/${zona.slug}`),
    provider: { '@id': ORG_ID },
    areaServed: {
      '@type': 'City',
      name: zona.nombre,
      containedInPlace: { '@type': 'AdministrativeArea', name: zona.comunidad },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: zona.geo.lat,
        longitude: zona.geo.lng,
      },
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      price: PRECIO_HORA_LIMPIEZA,
      unitText: 'hora',
      description: 'Precio por hora con contrato, alta en la Seguridad Social y factura.',
    },
  };
}

/** Oferta de empleo para Google for Jobs. Sin salario si no está fijado. */
export function jobPostingJsonLd(zona: Zona): JsonLd {
  const publicada = new Date(`${ofertaEmpleo.fechaPublicacion}T00:00:00Z`);
  const vigencia = new Date(publicada.getTime() + ofertaEmpleo.diasVigencia * 86_400_000);
  const ld: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: `${ofertaEmpleo.titulo} en ${zona.nombre}`,
    description: [
      `<p>Buscamos profesionales de la limpieza del hogar que vivan en ${zona.nombre} o alrededores.</p>`,
      '<ul>',
      ...ofertaEmpleo.condiciones.map((c) => `<li>${c}</li>`),
      '</ul>',
      '<p>Requisitos:</p><ul>',
      ...ofertaEmpleo.requisitos.map((r) => `<li>${r}</li>`),
      '</ul>',
    ].join(''),
    datePosted: ofertaEmpleo.fechaPublicacion,
    validThrough: vigencia.toISOString().slice(0, 10),
    employmentType: ofertaEmpleo.tipoContrato,
    directApply: true,
    hiringOrganization: { '@type': 'Organization', name: SITE_NAME, sameAs: SITE_URL },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: zona.nombre,
        postalCode: zona.codigosPostales[0],
        addressRegion: zona.comunidad,
        addressCountry: 'ES',
      },
    },
  };
  if (ofertaEmpleo.salarioHoraBrutoDesde !== null) {
    ld.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: 'EUR',
      value: {
        '@type': 'QuantitativeValue',
        minValue: ofertaEmpleo.salarioHoraBrutoDesde,
        unitText: 'HOUR',
      },
    };
  }
  return ld;
}

/** Serializa JSON-LD para un <script>, sin dejar que un texto cierre la etiqueta. */
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** Precio público por hora de la limpieza del hogar (IVA incluido). */
export const PRECIO_HORA_LIMPIEZA = 25;

export const faqsModelo: Faq[] = [
  {
    pregunta: '¿Cuánto cuesta una limpiadora por horas con Simvix?',
    respuesta: `${PRECIO_HORA_LIMPIEZA} € la hora, IVA incluido, con factura. El precio incluye el contrato y el alta en la Seguridad Social de la profesional, su seguro y la sustitución si un día no puede ir.`,
  },
  {
    pregunta: '¿Por qué es más caro que pagar a alguien en negro?',
    respuesta:
      'Porque la diferencia es lo que te protege: si la persona se lesiona en tu casa sin estar dada de alta, la responsabilidad es tuya. Con Simvix la empleadora es la empresa, tú solo recibes una factura y no tienes que hacer altas, nóminas ni cotizaciones.',
  },
  {
    pregunta: '¿Quién es el empleador de la profesional?',
    respuesta:
      'Simvix. La profesional tiene contrato laboral con nosotros y alta en la Seguridad Social. Tú contratas un servicio y recibes una factura; no asumes obligaciones de empleador.',
  },
  {
    pregunta: '¿Qué pasa si la profesional no puede venir o no estoy contento?',
    respuesta:
      'Te enviamos otra profesional verificada de tu zona. Si el servicio no ha quedado bien, volvemos a repasarlo sin coste en las 48 horas siguientes.',
  },
  {
    pregunta: '¿Cómo se verifica a las profesionales?',
    respuesta:
      'Entrevista personal, comprobación de identidad y permiso de trabajo, referencias de trabajos anteriores y una prueba pagada antes del primer servicio. Para el cuidado de menores pedimos además el certificado de delitos de naturaleza sexual.',
  },
  {
    pregunta: '¿Hay permanencia?',
    respuesta: 'No. Puedes pedir un servicio puntual o uno regular y cancelarlo cuando quieras avisando con 24 horas.',
  },
];

export function faqsZona(zona: Zona): Faq[] {
  return [
    {
      pregunta: `¿Tenéis limpiadoras por horas en ${zona.nombre}?`,
      respuesta: `Sí. Asignamos profesionales que viven en ${zona.nombre} o en los municipios de al lado, con contrato, alta en la Seguridad Social y garantía de sustitución. Precio: ${PRECIO_HORA_LIMPIEZA} € la hora, IVA incluido.`,
    },
    {
      pregunta: `¿En qué códigos postales de ${zona.nombre} dais servicio?`,
      respuesta: `En todos los del municipio: ${zona.codigosPostales.join(', ')}.`,
    },
    {
      pregunta: `¿Cuánto tarda en empezar el servicio en ${zona.nombre}?`,
      respuesta:
        'Te llamamos en menos de 24 horas laborables para conocer la casa y el horario, y te proponemos una profesional. El primer servicio suele poder hacerse esa misma semana.',
    },
    ...faqsModelo.slice(1, 4),
  ];
}

export function faqsEmpleo(zona: Zona): Faq[] {
  return [
    {
      pregunta: `¿Buscáis empleadas del hogar en ${zona.nombre}?`,
      respuesta: `Sí. Buscamos profesionales de la limpieza del hogar que vivan en ${zona.nombre} o cerca, para trabajar con contrato y alta en la Seguridad Social desde el primer día.`,
    },
    {
      pregunta: '¿Tengo que ser autónoma?',
      respuesta:
        'No. Trabajas por cuenta ajena, con contrato laboral y nómina. No pagas cuota de autónomos ni tienes que facturar.',
    },
    {
      pregunta: '¿Me cobráis algo por apuntarme?',
      respuesta: 'No. Apuntarte, la entrevista y la formación son gratis. Nunca cobramos nada a las profesionales.',
    },
    {
      pregunta: '¿Puedo elegir horario?',
      respuesta:
        'Sí. Nos dices en qué franjas estás disponible y te asignamos servicios cerca de casa dentro de esas franjas.',
    },
  ];
}
