import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { panelUrl } from '@/lib/panel-url';

/**
 * - /platform/* → panel SaaS
 * - {slug}.marlenapp.com → /s/{slug} (cuando el DNS wildcard apunte a este deploy)
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase() || '';

  if (pathname === '/platform' || pathname === '/platform/' || pathname.startsWith('/platform/')) {
    if (pathname === '/platform' || pathname === '/platform/') {
      return NextResponse.redirect(panelUrl('/'));
    }
    if (pathname === '/platform/login') {
      return NextResponse.redirect(panelUrl('/login'));
    }
    if (pathname === '/platform/centros') {
      return NextResponse.redirect(panelUrl('/empresas'));
    }
    const centro = pathname.match(/^\/platform\/centros\/([^/]+)$/);
    if (centro) {
      return NextResponse.redirect(panelUrl(`/empresas/${centro[1]}`));
    }
    return NextResponse.redirect(panelUrl('/'));
  }

  const m = host.match(/^([a-z0-9-]+)\.marlenapp\.com$/);
  if (m) {
    const sub = m[1]!;
    const skip = new Set(['app', 'www', 'api', 'sites', 'panel', 'mail']);
    if (!skip.has(sub) && !pathname.startsWith('/s/')) {
      const url = request.nextUrl.clone();
      url.pathname = pathname === '/' ? `/s/${sub}` : `/s/${sub}${pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/platform',
    '/platform/:path*',
    /*
     * Solo reescribe hosts de subdominio; en localhost no aplica.
     * Incluye casi todas las rutas para poder mapear / → /s/slug.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
