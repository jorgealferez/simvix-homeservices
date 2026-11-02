import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * Buscadores clásicos y rastreadores de IA pueden leer la web pública (GEO:
 * si no nos leen, no nos citan). Las áreas privadas (/obras, /portal, /api)
 * quedan fuera para todos.
 */
const PRIVADO = ['/api/', '/obras/', '/portal/'];
const RASTREADORES_IA = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'meta-externalagent',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVADO },
      { userAgent: RASTREADORES_IA, allow: '/', disallow: PRIVADO },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
