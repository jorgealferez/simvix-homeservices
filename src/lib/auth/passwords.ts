import bcrypt from 'bcryptjs';

const ROUNDS = Number(process.env.OBRAS_BCRYPT_ROUNDS ?? 12);

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/**
 * Política mínima (alineada con NIST 800-63B): mínimo 12 caracteres, no
 * imponemos clases de caracteres (más recomendación moderna). Bloqueamos los
 * 20 más comunes.
 */
const BANNED = new Set([
  'password', 'password1', '12345678', '123456789', 'qwerty', 'iloveyou', 'welcome',
  'admin', 'letmein', 'monkey', '123123', '111111', '000000', '1q2w3e4r',
  'abc123', 'qwertyuiop', 'password123', 'sunshine', 'princess', 'football',
]);

export function passwordPolicy(plain: string): { ok: boolean; reason?: string } {
  if (plain.length < 12) return { ok: false, reason: 'Mínimo 12 caracteres' };
  if (BANNED.has(plain.toLowerCase())) return { ok: false, reason: 'Contraseña demasiado común' };
  return { ok: true };
}
