/**
 * RBAC — control de acceso basado en roles. La matriz declarativa siguiente
 * está pensada para ser revisable de un vistazo. Cualquier cambio aquí debe
 * ir acompañado de un test (cuando se añadan en P03).
 */

export const ROLES = ['OWNER', 'ADMIN', 'ARCHITECT', 'TECHNICIAN', 'EXTERNAL', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  // Organización
  'org:read',
  'org:write',
  'org:members:manage',
  'org:billing',

  // Proyectos
  'project:read',
  'project:create',
  'project:write',
  'project:delete',
  'project:run-phase',
  'project:submit',

  // Documentos
  'document:read',
  'document:write',
  'document:review',
  'document:delete',

  // Presupuesto
  'budget:read',
  'budget:write',

  // Planos
  'drawing:read',
  'drawing:write',

  // Auditoría
  'audit:read',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const MATRIX: Record<Role, Permission[]> = {
  OWNER: [...PERMISSIONS],
  ADMIN: PERMISSIONS.filter((p) => p !== 'org:billing') as Permission[],
  ARCHITECT: [
    'org:read',
    'project:read',
    'project:create',
    'project:write',
    'project:delete',
    'project:run-phase',
    'project:submit',
    'document:read',
    'document:write',
    'document:review',
    'document:delete',
    'budget:read',
    'budget:write',
    'drawing:read',
    'drawing:write',
    'audit:read',
  ],
  TECHNICIAN: [
    'org:read',
    'project:read',
    'project:write',
    'project:run-phase',
    'document:read',
    'document:write',
    'budget:read',
    'budget:write',
    'drawing:read',
    'drawing:write',
  ],
  EXTERNAL: [
    'project:read',
    'document:read',
    'document:write',
    'document:review',
    'budget:read',
    'drawing:read',
    'drawing:write',
  ],
  VIEWER: [
    'org:read',
    'project:read',
    'document:read',
    'budget:read',
    'drawing:read',
    'audit:read',
  ],
};

export function permissionsOf(role: Role): readonly Permission[] {
  return MATRIX[role] ?? [];
}

export function can(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return permissionsOf(role).includes(permission);
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/** Equivalencia para tokens API. Scopes son string libres pero validamos contra Permission. */
export function parseScopes(csv: string | null | undefined): Permission[] {
  if (!csv) return [];
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is Permission => (PERMISSIONS as readonly string[]).includes(s));
}

export function tokenCan(scopes: Permission[], permission: Permission): boolean {
  return scopes.includes(permission);
}
