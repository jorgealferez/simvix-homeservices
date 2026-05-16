'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

interface Props {
  callbackUrl: string;
  initialError?: string;
}

export function LoginForm({ callbackUrl, initialError }: Props) {
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await signIn('credentials', {
      email: String(fd.get('email') ?? ''),
      password: String(fd.get('password') ?? ''),
      redirect: false,
      callbackUrl,
    });
    setSubmitting(false);
    if (res?.error) {
      setError('Credenciales inválidas o cuenta bloqueada temporalmente.');
      return;
    }
    if (res?.url) {
      window.location.href = res.url;
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block text-sm">
        <span className="text-slate-700">Email</span>
        <input
          name="email"
          type="email"
          required
          className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-700">Contraseña</span>
        <input
          name="password"
          type="password"
          required
          minLength={12}
          className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2"
        />
      </label>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-300 text-slate-900 font-medium py-2 rounded-md"
      >
        {submitting ? 'Comprobando…' : 'Entrar'}
      </button>
    </form>
  );
}
