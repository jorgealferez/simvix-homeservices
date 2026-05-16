import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

interface Params {
  params: Promise<{ id: string }>;
}

const submitSchema = z.object({
  channel: z.enum(['REGISTRO_TELEMATICO', 'REGISTRO_PRESENCIAL', 'SEDE_ELECTRONICA', 'CORREO_POSTAL']).optional(),
  registroEntrada: z.string().optional(),
  fechaPresentacion: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const submission = await prisma.submission.create({
    data: {
      projectId: id,
      ayuntamientoSlug: project.ayuntamientoSlug ?? 'generico',
      channel: parsed.data.channel ?? 'REGISTRO_TELEMATICO',
      status: 'SUBMITTED',
      registroEntrada: parsed.data.registroEntrada,
      fechaPresentacion: parsed.data.fechaPresentacion ? new Date(parsed.data.fechaPresentacion) : new Date(),
      responseNotes: parsed.data.notes,
    },
  });

  await prisma.project.update({
    where: { id },
    data: { status: 'SUBMITTED' },
  });

  await prisma.projectEvent.create({
    data: {
      projectId: id,
      type: 'SUBMITTED',
      actor: 'system',
      payload: JSON.stringify({ submissionId: submission.id }),
    },
  });

  return NextResponse.json({ submission });
}
