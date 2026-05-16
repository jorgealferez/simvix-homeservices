import { createHash } from 'node:crypto';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/security/crypto';

/**
 * P17 — Firma electrónica.
 *
 * Implementación SIMPLE_SHA256: el firmante reconoce explícitamente el hash
 * SHA-256 del contenido. Es legalmente equivalente a una firma manuscrita en
 * el ámbito del eIDAS REG.910/2014 "firma electrónica simple" si va acompañada
 * de constancia inequívoca de identidad y voluntad.
 *
 * Para EIDAS_ADVANCED o EIDAS_QUALIFIED hace falta integración con un PSC
 * cualificado (Autofirma del Gobierno + FNMT, o un TSP comercial). El modelo
 * ya tiene los campos certificatePem y timestampToken para encajar esa
 * integración cuando llegue.
 */

export function sha256Hex(content: Buffer | string): string {
  const buf = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
  return createHash('sha256').update(buf).digest('hex');
}

export interface SignOptions {
  resourceKind: 'document' | 'submission_package' | 'drawing';
  resourceId: string;
  content: Buffer | string;
  signer: {
    name: string;
    email?: string;
    dni?: string;
    userId?: string;
  };
  algorithm?: 'SIMPLE_SHA256' | 'EIDAS_ADVANCED' | 'EIDAS_QUALIFIED';
  certificatePem?: string;
  timestampToken?: string;
}

export async function sign(opts: SignOptions) {
  const sha = sha256Hex(opts.content);
  const enc = opts.signer.dni ? encrypt(opts.signer.dni) : null;
  return prisma.signature.create({
    data: {
      resourceKind: opts.resourceKind,
      resourceId: opts.resourceId,
      userId: opts.signer.userId,
      signerName: opts.signer.name,
      signerEmail: opts.signer.email,
      signerDni: enc,
      sha256: sha,
      algorithm: opts.algorithm ?? 'SIMPLE_SHA256',
      certificatePem: opts.certificatePem,
      timestampToken: opts.timestampToken,
      signedAt: new Date(),
    },
  });
}

export interface VerifyOptions {
  resourceKind: SignOptions['resourceKind'];
  resourceId: string;
  content: Buffer | string;
}

export interface VerifyResult {
  valid: boolean;
  matchingSignatures: { id: string; signerName: string; signedAt: Date; algorithm: string }[];
  expectedSha256: string;
}

export async function verify(opts: VerifyOptions): Promise<VerifyResult> {
  const expected = sha256Hex(opts.content);
  const sigs = await prisma.signature.findMany({
    where: { resourceKind: opts.resourceKind, resourceId: opts.resourceId, status: 'VALID' },
    orderBy: { signedAt: 'asc' },
  });
  const matching = sigs.filter((s) => s.sha256 === expected);
  return {
    valid: matching.length > 0,
    matchingSignatures: matching.map((s) => ({
      id: s.id,
      signerName: s.signerName,
      signedAt: s.signedAt,
      algorithm: s.algorithm,
    })),
    expectedSha256: expected,
  };
}

export async function revoke(signatureId: string, reason?: string) {
  await prisma.signature.update({
    where: { id: signatureId },
    data: { status: 'REVOKED' },
  });
  return prisma.projectEvent.findMany({ where: { type: 'SIGNATURE_REVOKED' }, take: 1 }).then(async () => {
    // log lateral: no tenemos projectId aquí; lo dejamos como dato en audit.
    if (reason) console.warn(`[signatures] revocada ${signatureId}: ${reason}`);
  });
}
