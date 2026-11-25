import { timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import { leadsEnabled } from '@/lib/leads-enabled';
import {
  adAccountsFromGraph,
  metaRedirectUri,
  pagesFromGraph,
} from '@/lib/meta-oauth';

export const dynamic = 'force-dynamic';

const STATE_COOKIE = 'meta_oauth_state';

function originOf(req: Request) {
  return process.env.APP_URL?.trim() || new URL(req.url).origin;
}

function sameState(cookie: string | undefined, query: string | null) {
  if (!cookie || !query) return false;
  const a = Buffer.from(cookie);
  const b = Buffer.from(query);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function graph<T>(path: string, token: string, fields: string): Promise<T | null> {
  const url = new URL(`https://graph.facebook.com/v21.0/${path}`);
  url.searchParams.set('fields', fields);
  url.searchParams.set('access_token', token);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = new URL('/ajustes/leads', originOf(req));
  const fail = (code: string) => {
    back.searchParams.set('error', code);
    const res = NextResponse.redirect(back);
    res.cookies.set(STATE_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  };

  const me = await getSession();
  if (!me) return NextResponse.redirect(new URL('/login', originOf(req)));
  if (me.role !== 'admin' || !await leadsEnabled(me.salon_id)) return fail('apagado');

  const cookie = cookies().get(STATE_COOKIE)?.value;
  if (!sameState(cookie, url.searchParams.get('state'))) {
    return fail('estado');
  }
  const code = url.searchParams.get('code');
  const appId = process.env.META_APP_ID?.trim();
  const secret = process.env.META_APP_SECRET?.trim();
  if (!code || !appId || !secret) return fail('config');

  const redirectUri = metaRedirectUri(originOf(req));
  const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', appId);
  tokenUrl.searchParams.set('client_secret', secret);
  tokenUrl.searchParams.set('redirect_uri', redirectUri);
  tokenUrl.searchParams.set('code', code);
  const tokenRes = await fetch(tokenUrl, { cache: 'no-store' });
  const tokenJson = tokenRes.ok
    ? await tokenRes.json() as { access_token?: string }
    : null;
  const userToken = tokenJson?.access_token;
  if (!userToken) return fail('token');

  const longUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
  longUrl.searchParams.set('grant_type', 'fb_exchange_token');
  longUrl.searchParams.set('client_id', appId);
  longUrl.searchParams.set('client_secret', secret);
  longUrl.searchParams.set('fb_exchange_token', userToken);
  const longRes = await fetch(longUrl, { cache: 'no-store' });
  const longJson = longRes.ok ? await longRes.json() as { access_token?: string } : null;
  const access = longJson?.access_token || userToken;

  const [pagesPayload, accountsPayload] = await Promise.all([
    graph<{ data?: { id?: string; name?: string; access_token?: string }[] }>('me/accounts', access, 'id,name,access_token'),
    graph<{ data?: { id?: string; name?: string }[] }>('me/adaccounts', access, 'id,name'),
  ]);
  const pages = pagesFromGraph(pagesPayload);
  const account = adAccountsFromGraph(accountsPayload)[0] ?? null;
  if (!pages.length) return fail('paginas');

  const admin = createAdminClient();
  await admin.from('meta_page_choices').delete().eq('salon_id', me.salon_id);
  const { error } = await admin.from('meta_page_choices').insert(pages.map(page => ({
    salon_id: me.salon_id,
    page_id: page.id,
    page_name: page.name,
    page_access_token: page.token,
    ad_account_id: account?.id ?? null,
    ad_account_name: account?.name ?? null,
  })));
  if (error) return fail('guardar');

  if (pages.length === 1) {
    const page = pages[0];
    const { error: saveError } = await admin.from('meta_connections').upsert({
      salon_id: me.salon_id,
      page_id: page.id,
      page_name: page.name,
      page_access_token: page.token,
      ad_account_id: account?.id ?? null,
      ad_account_name: account?.name ?? null,
    });
    if (saveError) return fail('guardar');
    await admin.from('meta_page_choices').delete().eq('salon_id', me.salon_id);
  }

  const res = NextResponse.redirect(back);
  res.cookies.set(STATE_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
