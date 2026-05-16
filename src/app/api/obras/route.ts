import { NextResponse } from 'next/server';
import { createProjectSchema } from '@/lib/obras/validation';
import { createProject, listProjects } from '@/lib/obras/projects';

export async function GET() {
  const projects = await listProjects({ take: 100 });
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 });
  }
  const project = await createProject(parsed.data);
  return NextResponse.json({ project }, { status: 201 });
}
