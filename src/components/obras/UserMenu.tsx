'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

export function UserMenu() {
  const { data, status } = useSession();
  if (status === 'loading') {
    return <span className="text-xs text-slate-400">…</span>;
  }
  if (!data?.user) {
    return (
      <Link href="/obras/login" className="text-sm text-slate-300 hover:text-white">
        Iniciar sesión
      </Link>
    );
  }
  const m = data.user.memberships?.[0];
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-300 hidden sm:inline">
        {data.user.email}
        {m && <span className="ml-1 text-slate-500">· {m.role}</span>}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: '/obras/login' })}
        className="text-xs underline text-slate-400 hover:text-white"
      >
        Salir
      </button>
    </div>
  );
}
