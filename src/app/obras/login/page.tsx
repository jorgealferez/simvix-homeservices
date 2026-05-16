import Link from 'next/link';
import { LoginForm } from '@/components/obras/LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-lg p-6 mt-8">
      <h1 className="text-xl font-bold text-slate-900">Acceso a Simvix Obras</h1>
      <p className="text-sm text-slate-600 mb-4">Introduce tu email y contraseña.</p>
      <LoginForm callbackUrl={sp.callbackUrl ?? '/obras'} initialError={sp.error} />
      <div className="mt-4 text-xs text-slate-500">
        ¿Sin cuenta?{' '}
        <Link href="/obras/registro" className="underline">
          Crear cuenta
        </Link>
      </div>
    </div>
  );
}
