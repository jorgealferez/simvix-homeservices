import { prisma } from '@/lib/db';
import { storage } from '@/lib/storage';
import { buildSubmissionPackage } from '@/lib/pdf/package';
import { sha256Hex } from '@/lib/obras/signatures';
import { getAyuntamiento } from '@/lib/obras/ayuntamientos';

/**
 * P18 — Sede electrónica.
 *
 * Implementa el ciclo de presentación del paquete documental al ayuntamiento:
 *
 *   1. preparePackage(): genera el PDF consolidado, calcula sha256 y lo
 *      almacena en storage. Crea/actualiza la Submission en estado PREPARED.
 *   2. submitToSede(): marca la submission como SUBMITTED (con la fecha) y
 *      registra el número de registro. En modo real haría POST al endpoint
 *      del ayuntamiento; en mock genera un registroEntrada plausible.
 *   3. pollStatus(): consulta el estado actual. Mock devuelve transiciones
 *      deterministas tras N horas; real haría GET con auth.
 *
 * Cada ayuntamiento puede tener un cliente distinto. En esta implementación
 * todos usan el adaptor `mockAdapter` salvo que se configure OBRAS_SEDE_<SLUG>_URL.
 */

export interface PreparePackageOptions {
  projectId: string;
  actor: string;
}

export async function preparePackage(opts: PreparePackageOptions) {
  const project = await prisma.project.findUnique({
    where: { id: opts.projectId },
    include: { client: true },
  });
  if (!project) throw new Error('Proyecto no encontrado');

  const bytes = await buildSubmissionPackage(opts.projectId);
  const hash = sha256Hex(Buffer.from(bytes));
  const key = `obras/${opts.projectId}/submissions/${hash.slice(0, 16)}-paquete.pdf`;
  const stored = await storage.put(key, Buffer.from(bytes), { mimeType: 'application/pdf' });

  // Buscamos una Submission PREPARED reciente con el mismo checksum
  // (mismo contenido del paquete) → idempotente.
  const existing = await prisma.submission.findFirst({
    where: {
      projectId: opts.projectId,
      cheksum: hash,
      status: 'PREPARED',
      deletedAt: null,
    },
  });
  const submission = existing
    ? existing
    : await prisma.submission.create({
        data: {
          projectId: opts.projectId,
          ayuntamientoSlug: project.ayuntamientoSlug ?? 'generico',
          channel: 'REGISTRO_TELEMATICO',
          status: 'PREPARED',
          packagePdfPath: stored.key,
          cheksum: hash,
        },
      });

  await prisma.projectEvent.create({
    data: {
      projectId: opts.projectId,
      type: 'PACKAGE_PREPARED',
      actor: opts.actor,
      payload: JSON.stringify({ submissionId: submission.id, sha256: hash, sizeBytes: stored.sizeBytes }),
    },
  });

  return submission;
}

export interface SubmitOptions {
  submissionId: string;
  actor: string;
}

export async function submitToSede(opts: SubmitOptions) {
  const sub = await prisma.submission.findUnique({ where: { id: opts.submissionId } });
  if (!sub) throw new Error('Submission no encontrada');
  if (sub.status === 'SUBMITTED') {
    return sub; // idempotente
  }
  const ayto = getAyuntamiento(sub.ayuntamientoSlug);
  const useLive = !!process.env[`OBRAS_SEDE_${sub.ayuntamientoSlug.toUpperCase()}_URL`];

  const registroEntrada = useLive
    ? await liveSubmit(ayto.slug, sub.packagePdfPath ?? '')
    : mockRegistroEntrada(sub.ayuntamientoSlug);

  const updated = await prisma.submission.update({
    where: { id: sub.id },
    data: {
      status: 'SUBMITTED',
      registroEntrada,
      fechaPresentacion: new Date(),
    },
  });

  await prisma.project.update({
    where: { id: sub.projectId },
    data: { status: 'SUBMITTED' },
  });

  await prisma.projectEvent.create({
    data: {
      projectId: sub.projectId,
      type: 'SUBMITTED',
      actor: opts.actor,
      payload: JSON.stringify({ submissionId: sub.id, registroEntrada, channel: sub.channel, live: useLive }),
    },
  });

  return updated;
}

async function liveSubmit(_slug: string, _path: string): Promise<string> {
  throw new Error('Integración live de sede no configurada.');
}

function mockRegistroEntrada(slug: string): string {
  const year = new Date().getFullYear();
  const seed = Math.floor(Math.random() * 99_999);
  return `${slug.toUpperCase()}-REG-${year}-${String(seed).padStart(5, '0')}`;
}

export async function pollStatus(submissionId: string) {
  const sub = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!sub) throw new Error('Submission no encontrada');
  if (sub.status !== 'SUBMITTED') return sub;

  // Mock: tras 24h transita a APPROVED; antes, sigue SUBMITTED.
  const hoursElapsed = sub.fechaPresentacion
    ? (Date.now() - sub.fechaPresentacion.getTime()) / 3_600_000
    : 0;
  if (hoursElapsed >= 24) {
    const updated = await prisma.submission.update({
      where: { id: sub.id },
      data: { status: 'APPROVED', fechaResolucion: new Date() },
    });
    await prisma.project.update({ where: { id: sub.projectId }, data: { status: 'APPROVED' } });
    await prisma.projectEvent.create({
      data: {
        projectId: sub.projectId,
        type: 'SUBMISSION_APPROVED',
        actor: 'system',
        payload: JSON.stringify({ submissionId: sub.id }),
      },
    });
    return updated;
  }
  return sub;
}
