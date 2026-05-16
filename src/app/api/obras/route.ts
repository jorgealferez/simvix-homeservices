import { NextResponse } from 'next/server';
import { createProjectSchema } from '@/lib/obras/validation';
import { createProject, listProjects } from '@/lib/obras/projects';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';

export async function GET() {
  try {
    const ctx = await requirePermission('project:read');
    const projects = await listProjects({
      take: 100,
      orgId: ctx.isPlatformAdmin ? undefined : ctx.activeOrgId ?? undefined,
    });
    return NextResponse.json({ projects });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requirePermission('project:create');
    const body = await req.json().catch(() => null);
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const project = await createProject(parsed.data, {
      orgId: ctx.activeOrgId,
      actor: ctx.userId,
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
