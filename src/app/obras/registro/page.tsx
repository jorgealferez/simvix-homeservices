import Link from 'next/link';
import { RegisterForm } from '@/components/obras/RegisterForm';

export const dynamic = 'force-dynamic';

export default function RegistroPage() {
  return (
    <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-lg p-6 mt-8">
      <h1 className="text-xl font-bold text-slate-900">Crear cuenta</h1>
      <p className="text-sm text-slate-600 mb-4">
        El primer usuario en darse de alta queda como OWNER de la organización por
        defecto. Los siguientes entran como VIEWER hasta ser promovidos.
      </p>
      <RegisterForm />
      <div className="mt-4 text-xs text-slate-500">
        ¿Ya tienes cuenta?{' '}
        <Link href="/obras/login" className="underline">
          Iniciar sesión
        </Link>
      </div>
    </div>
  );
}
