import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createOrganization, listOrganizations } from '@/lib/obras/organizations';
import { authErrorResponse, requirePermission } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requirePermission('org:read');
    const orgs = await listOrganizations();
    return NextResponse.json({ organizations: orgs });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
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
  try {
    await requirePermission('org:write');
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const org = await createOrganization(parsed.data);
    return NextResponse.json({ organization: org }, { status: 201 });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
}
