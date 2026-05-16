import { prisma } from '@/lib/db';
import { tokenize } from './catalogs';

/**
 * P11 — RAG normativa.
 *
 * Pipeline mínimo viable:
 *   1. ingestDocument(): chunking por párrafos / headings; persiste
 *      KnowledgeDoc + KnowledgeChunk con searchKey tokenizado.
 *   2. retrieveChunks(): búsqueda por solapamiento de tokens (BM25-lite).
 *
 * Cuando se migre a Postgres en producción, basta con:
 *   - Cambiar el provider de Prisma a postgresql.
 *   - Habilitar pgvector y añadir una columna `embedding vector(1024)` en
 *     KnowledgeChunk.
 *   - Calcular embeddings con un modelo (BGE, Voyage o el provider Anthropic
 *     que esté disponible) y rellenar `embedding`.
 *   - Sustituir retrieveChunks() por una query KNN sobre embedding.
 *
 * Mientras tanto, el solapamiento de tokens funciona razonablemente bien para
 * cuerpos < 10k chunks.
 */

interface ChunkInput {
  ordinal: number;
  section?: string;
  content: string;
}

/**
 * Chunking sencillo: divide por dobles saltos de línea (párrafos) y junta
 * párrafos pequeños hasta llegar al tamaño objetivo. Respeta los encabezados
 * en formato Markdown (líneas que empiezan con `#`) como `section` heredada.
 */
export function chunkText(text: string, targetChars = 1200): ChunkInput[] {
  const lines = text.split(/\n/);
  const out: ChunkInput[] = [];
  let section: string | undefined;
  let buf = '';
  let ordinal = 0;

  const flush = () => {
    const content = buf.trim();
    if (!content) return;
    out.push({ ordinal: ordinal++, section, content });
    buf = '';
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (/^#{1,6}\s/.test(line)) {
      flush();
      section = line.replace(/^#+\s*/, '').trim();
      continue;
    }
    if (line === '') {
      if (buf.length >= targetChars * 0.7) flush();
      else if (buf) buf += '\n';
      continue;
    }
    if (buf.length + line.length + 1 > targetChars && buf.length > 0) {
      flush();
    }
    buf += (buf ? '\n' : '') + line;
  }
  flush();
  return out;
}

export interface IngestParams {
  slug: string;
  title: string;
  kind: 'PGOU' | 'CTE_DB' | 'ORDENANZA' | 'RD' | 'AUTONOMICO';
  region?: string;
  source?: string;
  version?: string;
  body: string;
  /** Tamaño objetivo del chunk (chars). Default 1200. */
  targetChars?: number;
}

export async function ingestDocument(params: IngestParams) {
  const chunks = chunkText(params.body, params.targetChars);
  const doc = await prisma.knowledgeDoc.upsert({
    where: { slug: params.slug },
    update: {
      title: params.title,
      kind: params.kind,
      region: params.region ?? null,
      source: params.source ?? null,
      version: params.version ?? null,
    },
    create: {
      slug: params.slug,
      title: params.title,
      kind: params.kind,
      region: params.region,
      source: params.source,
      version: params.version,
    },
  });

  await prisma.knowledgeChunk.deleteMany({ where: { docId: doc.id } });
  if (chunks.length) {
    await prisma.knowledgeChunk.createMany({
      data: chunks.map((c) => ({
        docId: doc.id,
        ordinal: c.ordinal,
        section: c.section ?? null,
        content: c.content,
        searchKey: tokenize(c.content).join(' ').slice(0, 800),
        embeddingJson: null,
      })),
    });
  }
  return { doc, chunks: chunks.length };
}

export interface RetrieveOptions {
  /** Limitar a docs de un kind concreto (CTE_DB, PGOU, ...). */
  kind?: IngestParams['kind'];
  /** Restringir por slugs específicos. */
  docSlugs?: string[];
  /** Filtro por región (municipio o CCAA). */
  region?: string;
  limit?: number;
}

export interface RetrievedChunk {
  docSlug: string;
  docTitle: string;
  docKind: string;
  section: string | null;
  content: string;
  score: number;
}

export async function retrieveChunks(query: string, opts: RetrieveOptions = {}): Promise<RetrievedChunk[]> {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  const limit = Math.min(opts.limit ?? 5, 20);

  // Filtros sobre KnowledgeDoc
  const docWhere: Record<string, unknown> = {};
  if (opts.kind) docWhere.kind = opts.kind;
  if (opts.docSlugs?.length) docWhere.slug = { in: opts.docSlugs };
  if (opts.region) docWhere.region = opts.region;

  const candidates = await prisma.knowledgeChunk.findMany({
    where: {
      doc: docWhere,
      OR: tokens.slice(0, 8).map((t) => ({ searchKey: { contains: t } })),
    },
    include: { doc: { select: { slug: true, title: true, kind: true } } },
    take: 500,
  });

  const scored = candidates.map((c) => {
    let score = 0;
    for (const t of tokens) if (c.searchKey.includes(t)) score++;
    return { c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ c, score }) => ({
    docSlug: c.doc.slug,
    docTitle: c.doc.title,
    docKind: c.doc.kind,
    section: c.section,
    content: c.content,
    score,
  }));
}

/**
 * Compone un prompt con los chunks recuperados (RAG estándar). Pensado para
 * inyectarse como bloque cacheable en la llamada a Claude.
 */
export function formatRetrievedAsContext(chunks: RetrievedChunk[]): string {
  if (!chunks.length) return '';
  return chunks
    .map(
      (c, i) =>
        `[${i + 1}] ${c.docKind} · ${c.docTitle}${c.section ? ' · ' + c.section : ''}\n${c.content}`,
    )
    .join('\n\n---\n\n');
}
