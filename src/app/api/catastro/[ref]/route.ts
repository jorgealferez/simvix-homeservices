import { NextResponse } from 'next/server';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';
import { lookupCadastral } from '@/lib/obras/catastro';

interface Params {
  params: Promise<{ ref: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    await requirePermission('project:read');
    const { ref } = await params;
    const record = await lookupCadastral(ref);
    return NextResponse.json({ record });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
