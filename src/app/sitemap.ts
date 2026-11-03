import type { MetadataRoute } from 'next';
import { services } from '@/lib/services';
import { zonas } from '@/lib/zonas';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const url = (path: string) => `${SITE_URL}${path}`;

  const estaticas: MetadataRoute.Sitemap = [
    { url: url('/'), lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: url('/zonas'), lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: url('/servicios'), lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: url('/como-funciona'), lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: url('/empleo'), lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: url('/contacto'), lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: url('/aviso-legal'), lastModified, changeFrequency: 'yearly', priority: 0.2 },
    { url: url('/privacidad'), lastModified, changeFrequency: 'yearly', priority: 0.2 },
    { url: url('/condiciones'), lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const servicios: MetadataRoute.Sitemap = services.map((s) => ({
    url: url(`/servicios/${s.slug}`),
    lastModified,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  const porZona: MetadataRoute.Sitemap = zonas.flatMap((z) => [
    { url: url(`/zonas/${z.slug}`), lastModified, changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: url(`/empleo/${z.slug}`), lastModified, changeFrequency: 'weekly' as const, priority: 0.7 },
  ]);

  return [...estaticas, ...porZona, ...servicios];
}
