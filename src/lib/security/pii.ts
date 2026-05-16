import { decrypt, encrypt } from './crypto';

/**
 * Helpers de PII para el modelo Client. Aplican encriptación a `dni`,
 * `address` y `phone` antes de persistir y descifrado al leer.
 *
 * Diseñado para invocarse explícitamente en los servicios — evita la magia de
 * un middleware Prisma que enmascararía el flujo.
 */

const ENCRYPTED_FIELDS = ['dni', 'address', 'phone'] as const;
type EncField = (typeof ENCRYPTED_FIELDS)[number];

export function encryptClientFields<T extends Partial<Record<EncField, string | null | undefined>>>(
  data: T,
): T {
  const out: Record<string, unknown> = { ...data };
  for (const f of ENCRYPTED_FIELDS) {
    if (f in data) {
      out[f] = encrypt(data[f] ?? null);
    }
  }
  return out as T;
}

export function decryptClientFields<T extends Partial<Record<EncField, string | null | undefined>>>(
  data: T,
): T {
  if (!data) return data;
  const out: Record<string, unknown> = { ...data };
  for (const f of ENCRYPTED_FIELDS) {
    const v = data[f];
    if (typeof v === 'string') {
      out[f] = decrypt(v);
    }
  }
  return out as T;
}
