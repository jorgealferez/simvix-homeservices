'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      email: String(fd.get('email') ?? ''),
      password: String(fd.get('password') ?? ''),
      name: String(fd.get('name') ?? '') || undefined,
    };
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      const r = await signIn('credentials', {
        email: payload.email,
        password: payload.password,
        redirect: false,
        callbackUrl: '/obras',
      });
      if (r?.error) {
        setError('Cuenta creada pero el login automático falló. Inicia sesión manualmente.');
        return;
      }
      window.location.href = '/obras';
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block text-sm">
        <span className="text-slate-700">Nombre</span>
        <input name="name" className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="text-slate-700">Email *</span>
        <input
          name="email"
          type="email"
          required
          className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-700">Contraseña * (mínimo 12 caracteres)</span>
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
        {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
    </form>
  );
}
