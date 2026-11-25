import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/queries';
import { leadsEnabled } from '@/lib/leads-enabled';
import { metaAppConfigured, metaAuthUrl, metaOrigin, metaRedirectUri } from '@/lib/meta-oauth';

export const dynamic = 'force-dynamic';

const STATE_COOKIE = 'meta_oauth_state';

function originOf(req: Request) {
  const url = new URL(req.url);
  return metaOrigin({
    origin: url.origin,
    forwardedHost: req.headers.get('x-forwarded-host'),
    forwardedProto: req.headers.get('x-forwarded-proto'),
  });
}

export async function GET(req: Request) {
  const me = await getSession();
  const back = new URL('/ajustes/leads', originOf(req));
  if (!me) return NextResponse.redirect(new URL('/login', originOf(req)));
  if (me.role !== 'admin') return NextResponse.redirect(new URL('/ajustes', originOf(req)));
  if (!await leadsEnabled(me.salon_id)) {
    back.searchParams.set('error', 'apagado');
    return NextResponse.redirect(back);
  }
  const appId = process.env.META_APP_ID?.trim() ?? '';
  if (!metaAppConfigured({ appId, appSecret: process.env.META_APP_SECRET })) {
    back.searchParams.set('error', 'config');
    return NextResponse.redirect(back);
  }
  const state = randomBytes(16).toString('hex');
  const res = NextResponse.redirect(metaAuthUrl({
    appId,
    redirectUri: metaRedirectUri(originOf(req)),
    state,
    configId: process.env.META_LOGIN_CONFIG_ID,
  }));
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
