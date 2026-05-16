import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth/config';

/**
 * Protege:
 *   - /obras y /obras/* (exceptuando /obras/login y /obras/registro).
 *   - /api/obras (exceptuando /api/obras/intake/public — reservado a P02.19
 *     para formularios públicos firmados; no implementado todavía).
 *
 * Las APIs /api/health, /api/contact y /api/auth quedan abiertas.
 */
export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;
  const PUBLIC_PREFIXES = ['/obras/login', '/obras/registro'];
  const PUBLIC_API = ['/api/health', '/api/auth', '/api/contact'];

  const isAuthRoute = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  const isPublicApi = PUBLIC_API.some((p) => pathname.startsWith(p));

  // Permitir explícitamente
  if (isAuthRoute || isPublicApi) return NextResponse.next();

  // Rutas obras (UI y API) requieren sesión.
  const needsAuth = pathname.startsWith('/obras') || pathname.startsWith('/api/obras') || pathname.startsWith('/api/organizations');

  if (!needsAuth) return NextResponse.next();

  if (!req.auth) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const url = new URL('/obras/login', req.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/obras/:path*', '/api/obras/:path*', '/api/organizations/:path*'],
};
