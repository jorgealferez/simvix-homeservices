import { NextResponse } from 'next/server';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { summarize, type ProjectCteSummaryInputs } from '@/lib/cte';

export async function POST(req: Request) {
  try {
    await requirePermission('project:read');
    const body = (await req.json().catch(() => null)) as ProjectCteSummaryInputs | null;
    if (!body || !body.useType || !body.surfaceM2 || !body.obraType) {
      return NextResponse.json({ error: 'Faltan campos básicos del proyecto' }, { status: 400 });
    }
    const result = summarize(body);
    return NextResponse.json({ result });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
