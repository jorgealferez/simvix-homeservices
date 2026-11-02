import type { NextAuthConfig } from 'next-auth';

/**
 * Parte de la configuración de Auth.js que puede correr en el runtime Edge
 * (el middleware de Next). No importa Prisma, el adaptador ni nada de Node:
 * con sesiones JWT, el middleware solo necesita descifrar la cookie.
 *
 * `config.ts` la extiende con el adaptador, el proveedor de credenciales y el
 * callback `jwt`, que sí leen la base de datos y solo corren en Node.
 * Importar `config.ts` desde el middleware rompía toda ruta protegida con un
 * 500 («PrismaClient is not configured to run in Edge Runtime»).
 */
export const edgeAuthConfig = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/obras/login',
  },
  providers: [],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.uid) {
        session.user.id = token.uid as string;
        session.user.isPlatformAdmin = !!token.isPlatformAdmin;
        session.user.memberships =
          (token.memberships as { orgId: string; orgSlug: string; role: string }[]) ?? [];
        session.user.activeOrgId = (token.activeOrgId as string | null) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
