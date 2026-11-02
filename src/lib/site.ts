/**
 * Datos del sitio público de Simvix Home Services en un solo sitio: URL
 * canónica, marca y contacto. Todo lo que aparece en metadatos, JSON-LD,
 * sitemap y llms.txt sale de aquí para que no haya dos versiones de la verdad.
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://homeservices.simvix.com'
).replace(/\/+$/, '');

export const SITE_NAME = 'Simvix Home Services';

/**
 * Promesa de marca en una frase. Pedir es tan fácil como pedir un coche con
 * conductor, pero no se dice así: se dice lo que el cliente recibe.
 */
export const TAGLINE =
  'Pides en dos minutos, te asignamos una profesional verificada de tu zona, con contrato y garantía de sustitución.';

export const CONTACT = {
  telefono: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? '+34 711 526 127',
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'hola@simvix.com',
  /** Número de WhatsApp Business en formato internacional sin "+" (opcional). */
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? '',
  horario: 'Lunes a viernes 8:00–20:00 · Sábados 9:00–14:00',
} as const;

/** Imagen para compartir (src/app/opengraph-image.tsx); las páginas que definen openGraph la repiten. */
export const OG_IMAGE = { url: '/opengraph-image', width: 1200, height: 630 };

export function absoluteUrl(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
