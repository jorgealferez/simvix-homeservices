import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { preparePackage, submitToSede, pollStatus } from '@/lib/obras/sede';

interface Params {
  params: Promise<{ id: string }>;
}

const schema = z.object({
  action: z.enum(['prepare', 'submit', 'poll']),
  submissionId: z.string().optional(),
});

export async function POST(req: Request, { params }: Params) {
  try {
    const ctx = await requirePermission('project:submit');
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    if (parsed.data.action === 'prepare') {
      const s = await preparePackage({ projectId: id, actor: ctx.userId });
      return NextResponse.json({ submission: s });
    }
    if (parsed.data.action === 'submit') {
      if (!parsed.data.submissionId) {
        return NextResponse.json({ error: 'submissionId requerido' }, { status: 400 });
      }
      const s = await submitToSede({ submissionId: parsed.data.submissionId, actor: ctx.userId });
      return NextResponse.json({ submission: s });
    }
    if (parsed.data.action === 'poll') {
      if (!parsed.data.submissionId) {
        return NextResponse.json({ error: 'submissionId requerido' }, { status: 400 });
      }
      const s = await pollStatus(parsed.data.submissionId);
      return NextResponse.json({ submission: s });
    }
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
