import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { panelUrl } from '@/lib/panel-url';

/** /platform/* ya no existe en marlen-app; redirige al panel SaaS desacoplado. */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

export const config = {
  matcher: ['/platform', '/platform/:path*'],
};
