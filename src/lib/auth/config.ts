import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyPassword } from './passwords';
import { getOrCreateDefaultOrg } from '@/lib/obras/organizations';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const MAX_FAILED = Number(process.env.OBRAS_MAX_FAILED_LOGINS ?? 5);
const LOCK_MIN = Number(process.env.OBRAS_LOCK_MINUTES ?? 15);

export const authConfig: NextAuthConfig = {
  // PrismaAdapter requiere modelos User/Account/Session/VerificationToken.
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/obras/login',
  },
  providers: [
    Credentials({
      name: 'Email y contraseña',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        // Lock-out
        if (user.lockedUntil && user.lockedUntil > new Date()) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) {
          const failed = user.failedLoginAttempts + 1;
          const lockedUntil =
            failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MIN * 60 * 1000) : null;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: failed,
              ...(lockedUntil ? { lockedUntil } : {}),
            },
          });
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.uid = user.id;
        // Cargar memberships para el JWT (cabe holgado: cada usuario suele
        // pertenecer a pocas orgs).
        const memberships = await prisma.organizationMember.findMany({
          where: { userId: user.id },
          select: { orgId: true, role: true, org: { select: { slug: true } } },
        });
        token.memberships = memberships.map((m) => ({
          orgId: m.orgId,
          orgSlug: m.org.slug,
          role: m.role,
        }));
        // Org activa por defecto
        token.activeOrgId = memberships[0]?.orgId ?? null;

        // Promoción automática: el primer usuario es OWNER de la org default.
        if (!memberships.length) {
          const def = await getOrCreateDefaultOrg();
          const count = await prisma.organizationMember.count({
            where: { orgId: def.id },
          });
          const role = count === 0 ? 'OWNER' : 'VIEWER';
          await prisma.organizationMember.create({
            data: { orgId: def.id, userId: user.id, role },
          });
          token.memberships = [{ orgId: def.id, orgSlug: def.slug, role }];
          token.activeOrgId = def.id;
        }

        // Marca de admin de plataforma
        const u = await prisma.user.findUnique({
          where: { id: user.id },
          select: { isPlatformAdmin: true },
        });
        token.isPlatformAdmin = !!u?.isPlatformAdmin;
      }
      return token;
    },
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
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
