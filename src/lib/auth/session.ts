import { auth } from './config';
import { can, type Permission, type Role } from './rbac';

export interface AuthContext {
  userId: string;
  email: string;
  isPlatformAdmin: boolean;
  memberships: { orgId: string; orgSlug: string; role: Role }[];
  activeOrgId: string | null;
  activeRole: Role | null;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const memberships = session.user.memberships.map((m) => ({
    ...m,
    role: m.role as Role,
  }));
  const active =
    memberships.find((m) => m.orgId === session.user.activeOrgId) ?? memberships[0];
  return {
    userId: session.user.id,
    email: session.user.email ?? '',
    isPlatformAdmin: !!session.user.isPlatformAdmin,
    memberships,
    activeOrgId: active?.orgId ?? null,
    activeRole: active?.role ?? null,
  };
}

export class UnauthorizedError extends Error {
  constructor() {
    super('No autenticado');
    this.name = 'UnauthorizedError';
  }
}
export class ForbiddenError extends Error {
  constructor(public readonly required: Permission) {
    super(`Permiso insuficiente: ${required}`);
    this.name = 'ForbiddenError';
  }
}

/**
 * Helper para API routes: garantiza sesión + permiso. Devuelve el contexto
 * o lanza UnauthorizedError/ForbiddenError. El handler convierte a 401/403.
 */
export async function requirePermission(permission: Permission): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw new UnauthorizedError();
  if (ctx.isPlatformAdmin) return ctx;
  if (!can(ctx.activeRole, permission)) throw new ForbiddenError(permission);
  return ctx;
}

/**
 * Tomado como wrapper para handlers Next que devuelven Response.
 */
export function authErrorResponse(err: unknown): Response | null {
  if (err instanceof UnauthorizedError) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (err instanceof ForbiddenError) {
    return new Response(
      JSON.stringify({ error: 'Permiso insuficiente', required: err.required }),
      { status: 403, headers: { 'content-type': 'application/json' } },
    );
  }
  return null;
}
