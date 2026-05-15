import { NextResponse } from 'next/server';
import { getProjectDetail } from '@/lib/obras/projects';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const project = await getProjectDetail(id);
  if (!project) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }
  return NextResponse.json({ project });
}
