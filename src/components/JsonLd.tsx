import { serializeJsonLd, type JsonLd as JsonLdData } from '@/lib/seo';

/** Inserta uno o varios bloques schema.org en JSON-LD. */
export default function JsonLd({ data }: { data: JsonLdData | JsonLdData[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
