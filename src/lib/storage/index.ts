import { mkdir, writeFile, readFile, stat, unlink } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';

/**
 * Storage abstraction. Implementación por defecto: filesystem local bajo
 * `OBRAS_STORAGE_PATH`. Pensada para sustituirse por S3/R2 en producción sin
 * tocar los servicios — basta cambiar la implementación de `Storage`.
 */

export interface PutOptions {
  /** Tipo MIME para almacenar como metadato lógico (sólo informativo en FS). */
  mimeType?: string;
}

export interface StoredObject {
  /** Clave estable: `obras/<projectId>/drawings/<id>.<ext>` */
  key: string;
  sizeBytes: number;
  sha256: string;
  mimeType?: string;
}

export interface Storage {
  put(key: string, data: Buffer, opts?: PutOptions): Promise<StoredObject>;
  get(key: string): Promise<Buffer>;
  getStream(key: string): NodeJS.ReadableStream;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /**
   * URL pre-firmada (sólo soportado por backends con firma — el local devuelve
   * una ruta interna que el endpoint `/api/storage/...` resolverá).
   */
  signedUrl?(key: string, ttlSeconds?: number): Promise<string>;
}

const BASE = resolve(process.env.OBRAS_STORAGE_PATH ?? './storage');

function assertSafe(key: string): string {
  // Normaliza y previene path traversal: tras resolve, debe estar dentro de BASE.
  const normalized = normalize(key).replace(/^[\\/]+/, '');
  if (normalized.includes('..') || normalized.split(sep).includes('..')) {
    throw new Error('Clave inválida (path traversal)');
  }
  const full = resolve(BASE, normalized);
  if (!full.startsWith(BASE + sep) && full !== BASE) {
    throw new Error('Clave inválida (fuera del root)');
  }
  return full;
}

const localStorage: Storage = {
  async put(key, data, opts) {
    const full = assertSafe(key);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, data);
    const sha256 = createHash('sha256').update(data).digest('hex');
    return {
      key,
      sizeBytes: data.byteLength,
      sha256,
      mimeType: opts?.mimeType,
    };
  },
  async get(key) {
    return readFile(assertSafe(key));
  },
  getStream(key) {
    return createReadStream(assertSafe(key));
  },
  async delete(key) {
    try {
      await unlink(assertSafe(key));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
  },
  async exists(key) {
    try {
      await stat(assertSafe(key));
      return true;
    } catch {
      return false;
    }
  },
};

export const storage: Storage = localStorage;

/**
 * Genera una clave única para un fichero subido al proyecto.
 */
export function makeDrawingKey(projectId: string, originalName: string): string {
  const ext = originalName.includes('.')
    ? '.' + originalName.split('.').pop()!.toLowerCase().slice(0, 8).replace(/[^a-z0-9]/g, '')
    : '';
  const id = randomBytes(8).toString('hex');
  return `obras/${projectId}/drawings/${id}${ext}`;
}

export function makeUploadToken(): string {
  return randomBytes(24).toString('base64url');
}

/** Detecta el mimetype por extensión para uploads que no lo declaran. */
const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  dxf: 'image/vnd.dxf',
  ifc: 'application/x-step',
  zip: 'application/zip',
};

export function mimeFromName(name: string): string | undefined {
  const ext = name.split('.').pop()?.toLowerCase();
  return ext ? MIME_BY_EXT[ext] : undefined;
}
