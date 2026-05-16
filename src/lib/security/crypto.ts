import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

/**
 * Encriptación at-rest de campos sensibles (DNI, dirección, teléfono).
 *
 * Formato del ciphertext almacenado: "enc:v1:<b64(iv|authTag|cipher)>".
 * Algoritmo: AES-256-GCM (autenticado).
 *
 * La clave maestra se toma de `OBRAS_FIELD_KEY` (base64, 32 bytes). Si no está
 * definida, se deriva un fallback determinista a partir de
 * `process.env.NEXTAUTH_SECRET || 'simvix-obras-dev-key'` para que la API
 * siga funcionando en dev/CI sin coste de configuración extra. **En
 * producción debe configurarse explícitamente.**
 */

const PREFIX = 'enc:v1:';

function loadKey(): Buffer {
  const raw = process.env.OBRAS_FIELD_KEY;
  if (raw && raw.trim()) {
    const buf = Buffer.from(raw.trim(), 'base64');
    if (buf.length === 32) return buf;
    // Si no son 32 bytes, derivamos por hash para tolerar entrada incorrecta
    return createHash('sha256').update(raw.trim()).digest();
  }
  const seed = process.env.NEXTAUTH_SECRET ?? 'simvix-obras-dev-key';
  return createHash('sha256').update(seed).digest();
}

let _key: Buffer | null = null;
function key(): Buffer {
  if (!_key) _key = loadKey();
  return _key;
}

export function isEncrypted(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export function encrypt(plain: string | null | undefined): string | null {
  if (plain === null || plain === undefined || plain === '') return plain ?? null;
  if (isEncrypted(plain)) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString('base64');
}

export function decrypt(stored: string | null | undefined): string | null {
  if (stored === null || stored === undefined || stored === '') return stored ?? null;
  if (!isEncrypted(stored)) return stored;
  const buf = Buffer.from(stored.slice(PREFIX.length), 'base64');
  if (buf.length < 12 + 16 + 1) return null;
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  try {
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString('utf8');
  } catch {
    // Fallo de autenticación (clave cambiada, dato corrupto). Devolver null
    // para evitar exponer ciphertext bruto.
    return null;
  }
}

/** Hash determinista (no reversible) para usar en índices/búsqueda equality. */
export function deterministicHash(plain: string): string {
  return createHash('sha256').update(`simvix-obras|${plain}`).digest('hex');
}

/** Lanza si la configuración de prod es insuficiente. Llamar en startup. */
export function assertProductionCryptoReady(): void {
  if (process.env.NODE_ENV === 'production' && !process.env.OBRAS_FIELD_KEY) {
    throw new Error(
      'OBRAS_FIELD_KEY no está configurada en producción. Genera 32 bytes en base64 con `openssl rand -base64 32` y configúrala en el entorno.',
    );
  }
}
