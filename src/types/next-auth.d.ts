import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isPlatformAdmin: boolean;
      memberships: { orgId: string; orgSlug: string; role: string }[];
      activeOrgId: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string;
    isPlatformAdmin?: boolean;
    memberships?: { orgId: string; orgSlug: string; role: string }[];
    activeOrgId?: string | null;
  }
}
