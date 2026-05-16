import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/db';

/**
 * P20 — Portal cliente.
 *
 * Acceso de cliente final (sin necesidad de cuenta) mediante un token firmado.
 * El token contiene una parte aleatoria + un HMAC del email destinatario para
 * detectar manipulación. La fuente de verdad es la tabla PortalAccess.
 */

function secretKey(): Buffer {
  const raw = process.env.OBRAS_FIELD_KEY ?? process.env.NEXTAUTH_SECRET ?? 'simvix-obras-dev-key';
  return Buffer.from(raw.padEnd(32, '_').slice(0, 32));
}

function signToken(rawToken: string, email: string): string {
  const mac = createHmac('sha256', secretKey()).update(`${rawToken}|${email}`).digest('base64url').slice(0, 16);
  return `${rawToken}.${mac}`;
}

export async function issuePortalAccess(opts: {
  projectId: string;
  recipientEmail: string;
  recipientName?: string;
  expiresInDays?: number;
}) {
  const raw = randomBytes(18).toString('base64url');
  const token = signToken(raw, opts.recipientEmail);
  const access = await prisma.portalAccess.create({
    data: {
      projectId: opts.projectId,
      recipientEmail: opts.recipientEmail,
      recipientName: opts.recipientName,
      token,
      expiresAt: opts.expiresInDays
        ? new Date(Date.now() + opts.expiresInDays * 86400 * 1000)
        : null,
    },
  });
  return access;
}

export async function resolveToken(token: string) {
  if (!token || !token.includes('.')) return null;
  const [raw, mac] = token.split('.');
  if (!raw || !mac) return null;
  const access = await prisma.portalAccess.findUnique({ where: { token } });
  if (!access) return null;
  if (access.revokedAt) return null;
  if (access.expiresAt && access.expiresAt < new Date()) return null;
  // Verificación criptográfica (defensa en profundidad)
  const expected = createHmac('sha256', secretKey())
    .update(`${raw}|${access.recipientEmail}`)
    .digest('base64url')
    .slice(0, 16);
  if (mac.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  return access;
}

export async function recordPortalView(token: string) {
  await prisma.portalAccess.updateMany({
    where: { token },
    data: {
      lastViewedAt: new Date(),
      viewCount: { increment: 1 },
    },
  });
}

export async function revokePortalAccess(id: string) {
  return prisma.portalAccess.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}
