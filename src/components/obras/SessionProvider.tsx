'use client';

import { SessionProvider } from 'next-auth/react';

export function ObrasSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
