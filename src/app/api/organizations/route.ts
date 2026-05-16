import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createOrganization, listOrganizations } from '@/lib/obras/organizations';

export const dynamic = 'force-dynamic';

export async function GET() {
  const orgs = await listOrganizations();
  return NextResponse.json({ organizations: orgs });
}

const createSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(120),
  maxProjects: z.number().int().positive().nullable().optional(),
  maxAiTokensMonthly: z.number().int().positive().nullable().optional(),
  maxStorageMb: z.number().int().positive().nullable().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const org = await createOrganization(parsed.data);
    return NextResponse.json({ organization: org }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error desconocido' },
      { status: 400 },
    );
  }
}
