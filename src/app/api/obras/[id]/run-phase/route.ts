import { NextResponse } from 'next/server';
import { runPhase, runAllPendingPhases } from '@/lib/ai/orchestrator';
import { runPhaseSchema } from '@/lib/obras/validation';
import type { PhaseType } from '@/lib/obras/enums';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  // Si no llega `phase`, ejecutamos todas las pendientes (un click → todo el flujo)
  if (!body?.phase) {
    const result = await runAllPendingPhases(id);
    return NextResponse.json({ result });
  }
  const parsed = runPhaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 });
  }
  const result = await runPhase(id, parsed.data.phase as PhaseType, parsed.data.userInput);
  return NextResponse.json({ result });
}
