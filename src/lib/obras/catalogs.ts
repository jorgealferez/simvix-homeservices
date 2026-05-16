import { prisma } from '@/lib/db';
import type { PriceCatalogItem, Prisma } from '@prisma/client';

/**
 * P07 — Catálogo de precios.
 *
 * Funciones:
 *   - importCsv: ingesta de un CSV con `chapter,code,description,unit,unitPrice`.
 *   - searchItems: búsqueda fuzzy básica (token overlap + LIKE) sobre searchKey.
 *   - suggestPriceForDescription: dado un texto libre, devuelve los top-N items
 *     más similares con su precio.
 *
 * La búsqueda es deliberadamente simple (sin pgvector / SQLite FTS) para que
 * funcione en SQLite local. Cuando se migre a Postgres, P11 sustituirá esto
 * por embeddings (pgvector) sin cambiar la API pública.
 */

const STOPWORDS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'en', 'con', 'sin', 'y', 'o', 'a', 'para',
  'por', 'un', 'una', 'unos', 'unas', 'al', 'lo', 'que', 'es', 'mm', 'cm', 'm', 'm2', 'm3', 'ud',
]);

/** Normaliza a lowercase, sin acentos, sin puntuación; resultado idempotente. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(s: string): string[] {
  return normalize(s)
    .split(' ')
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function buildSearchKey(chapter: string, description: string, longDescription?: string | null): string {
  return tokenize([chapter, description, longDescription ?? ''].join(' '))
    .join(' ')
    .slice(0, 800);
}

interface ImportRow {
  chapter: string;
  code: string;
  description: string;
  longDescription?: string;
  unit: string;
  unitPrice: number;
}

/** Parser CSV minimalista: separador `,` o `;`, comillas dobles. Cabecera requerida. */
export function parseCsv(text: string): ImportRow[] {
  const rows = splitCsvLines(text);
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const required = ['chapter', 'code', 'description', 'unit', 'unitprice'];
  for (const r of required) {
    if (!header.includes(r)) throw new Error(`Falta columna obligatoria: ${r}`);
  }
  const idx = (name: string) => header.indexOf(name);
  const out: ImportRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r.length || r.every((c) => !c.trim())) continue;
    const unitPrice = Number(r[idx('unitprice')]?.replace(',', '.'));
    if (!Number.isFinite(unitPrice)) {
      throw new Error(`Línea ${i + 1}: unitPrice no numérico: ${r[idx('unitprice')]}`);
    }
    out.push({
      chapter: (r[idx('chapter')] ?? '').trim(),
      code: (r[idx('code')] ?? '').trim(),
      description: (r[idx('description')] ?? '').trim(),
      longDescription: idx('longdescription') >= 0 ? (r[idx('longdescription')] ?? '').trim() : undefined,
      unit: (r[idx('unit')] ?? '').trim(),
      unitPrice,
    });
  }
  return out;
}

function splitCsvLines(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let buf = '';
  let inQuotes = false;
  let sep: ',' | ';' = ',';
  // Heurística de separador: si la primera línea sin comillas tiene más `;` que `,`, usar `;`.
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  if (firstLine.split(';').length > firstLine.split(',').length) sep = ';';

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        buf += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        buf += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === sep) {
        cur.push(buf);
        buf = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        cur.push(buf);
        rows.push(cur);
        cur = [];
        buf = '';
      } else {
        buf += ch;
      }
    }
  }
  if (buf.length || cur.length) {
    cur.push(buf);
    rows.push(cur);
  }
  return rows;
}

export interface ImportCatalogParams {
  slug: string;
  name: string;
  source: string;
  region?: string;
  year?: number;
  orgId?: string | null;
  priceVersion?: string;
  csv: string;
}

export async function importCatalogFromCsv(params: ImportCatalogParams) {
  const rows = parseCsv(params.csv);
  if (!rows.length) throw new Error('CSV vacío');

  const catalog = await prisma.priceCatalog.upsert({
    where: { slug: params.slug },
    update: {
      name: params.name,
      source: params.source,
      region: params.region ?? null,
      year: params.year ?? null,
      orgId: params.orgId ?? null,
      active: true,
      importNotes: `Reimportado el ${new Date().toISOString()}: ${rows.length} ítems`,
    },
    create: {
      slug: params.slug,
      name: params.name,
      source: params.source,
      region: params.region,
      year: params.year,
      orgId: params.orgId ?? null,
      importNotes: `Importado el ${new Date().toISOString()}: ${rows.length} ítems`,
    },
  });

  // Borramos ítems existentes y volvemos a cargar (idempotencia + simplicidad).
  await prisma.priceCatalogItem.deleteMany({ where: { catalogId: catalog.id } });
  await prisma.priceCatalogItem.createMany({
    data: rows.map((r) => ({
      catalogId: catalog.id,
      chapter: r.chapter,
      code: r.code,
      description: r.description,
      longDescription: r.longDescription ?? null,
      unit: r.unit,
      unitPrice: r.unitPrice,
      priceVersion: params.priceVersion ?? null,
      searchKey: buildSearchKey(r.chapter, r.description, r.longDescription),
    })),
  });

  return { catalog, itemsCount: rows.length };
}

export interface SearchOptions {
  catalogSlugs?: string[];
  orgId?: string | null;
  limit?: number;
}

/**
 * Búsqueda fuzzy básica: cada token de la query es buscado con `contains` sobre
 * searchKey; se puntúa por nº de tokens coincidentes (y peso adicional si el
 * código coincide). Adecuada para catálogos < 10k ítems.
 */
export async function searchItems(query: string, opts: SearchOptions = {}) {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  const limit = Math.min(opts.limit ?? 10, 50);

  const where: Prisma.PriceCatalogItemWhereInput = {};
  if (opts.catalogSlugs?.length) {
    where.catalog = { slug: { in: opts.catalogSlugs }, active: true };
  } else {
    where.catalog = {
      active: true,
      OR: [{ orgId: null }, ...(opts.orgId ? [{ orgId: opts.orgId }] : [])],
    };
  }
  // OR de contains por cada token (límite razonable de longitud).
  where.OR = tokens.slice(0, 8).map((t) => ({ searchKey: { contains: t } }));

  const rows = await prisma.priceCatalogItem.findMany({
    where,
    take: 200,
    include: { catalog: { select: { slug: true, name: true, source: true } } },
  });

  const scored = rows.map((row) => {
    let score = 0;
    for (const t of tokens) {
      if (row.searchKey.includes(t)) score++;
      if (row.code.toLowerCase().includes(t)) score += 2;
    }
    return { row, score };
  });
  scored.sort((a, b) => b.score - a.score || a.row.code.localeCompare(b.row.code));
  return scored.slice(0, limit).map((s) => ({
    score: s.score,
    item: s.row,
  }));
}

export async function suggestPriceForDescription(description: string, opts: SearchOptions = {}) {
  const matches = await searchItems(description, { ...opts, limit: 5 });
  if (!matches.length) return null;
  return {
    bestMatch: matches[0].item,
    alternatives: matches.slice(1).map((m) => m.item),
  };
}

/** Crea una BudgetItem a partir de un PriceCatalogItem con la cantidad dada. */
export async function addBudgetItemFromCatalog(
  projectId: string,
  catalogItemId: string,
  quantity: number,
) {
  const item = await prisma.priceCatalogItem.findUnique({
    where: { id: catalogItemId },
    include: { catalog: true },
  });
  if (!item) throw new Error('Ítem no encontrado en catálogo');
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('quantity debe ser positivo');
  }
  return prisma.budgetItem.create({
    data: {
      projectId,
      chapter: item.chapter,
      code: item.code,
      description: item.description,
      unit: item.unit,
      quantity,
      unitPrice: item.unitPrice,
      total: quantity * item.unitPrice,
      source: item.catalog.name,
      catalogSlug: item.catalog.slug,
      catalogItemCode: item.code,
    },
  });
}

export type SearchResult = Awaited<ReturnType<typeof searchItems>>[number];
export type CatalogItem = PriceCatalogItem;
