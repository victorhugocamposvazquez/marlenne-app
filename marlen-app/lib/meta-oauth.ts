/** Inicio de sesión de Meta. Sin DOM ni next: la URL y lo que devuelve Graph. */

import { appOriginFromEnv } from '@/lib/app-origin';

export const META_OAUTH_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'leads_retrieval',
  'ads_read',
  'business_management',
] as const;

export type MetaPageChoice = {
  id: string;
  name: string;
  token: string;
};

export type MetaAdAccount = {
  id: string;
  name: string;
};

export function metaAppConfigured(env: { appId?: string | null; appSecret?: string | null }) {
  return Boolean(env.appId?.trim() && env.appSecret?.trim());
}

export function metaRedirectUri(origin: string) {
  const base = origin.replace(/\/$/, '');
  return `${base}/api/meta/oauth/callback`;
}

/** Meta solo acepta dominios dados de alta. La vuelta siempre va al host de APP_URL. */
export function metaOAuthOrigin(req: Request) {
  const env = appOriginFromEnv();
  if (env && env !== 'http://localhost:3000') return env;
  const url = new URL(req.url);
  return metaOrigin({
    origin: url.origin,
    forwardedHost: req.headers.get('x-forwarded-host'),
    forwardedProto: req.headers.get('x-forwarded-proto'),
  });
}

/** El host con el que el admin abrió la app. Así Vercel y app.marlenapp.com vuelven cada uno a sí mismo. */
export function metaOrigin(input: {
  origin: string;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
}) {
  const host = input.forwardedHost?.split(',')[0]?.trim();
  if (!host) return input.origin.replace(/\/$/, '');
  const proto = input.forwardedProto?.split(',')[0]?.trim() || 'https';
  return `${proto}://${host}`;
}

export function metaAuthUrl(input: {
  appId: string;
  redirectUri: string;
  state: string;
  configId?: string | null;
}) {
  const url = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  url.searchParams.set('client_id', input.appId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('state', input.state);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', META_OAUTH_SCOPES.join(','));
  const configId = input.configId?.trim();
  if (configId) {
    // Sin scope + config_id, Facebook abre el inicio normal y esta app lo tiene cerrado.
    url.searchParams.set('config_id', configId);
  }
  return url.toString();
}

export function pagesFromGraph(payload: {
  data?: { id?: string; name?: string; access_token?: string }[];
} | null | undefined): MetaPageChoice[] {
  const out: MetaPageChoice[] = [];
  for (const row of payload?.data ?? []) {
    const id = row.id?.trim();
    const token = row.access_token?.trim();
    if (!id || !token) continue;
    out.push({ id, name: row.name?.trim() || 'Página de Facebook', token });
  }
  return out;
}

export function adAccountsFromGraph(payload: {
  data?: { id?: string; name?: string }[];
} | null | undefined): MetaAdAccount[] {
  const out: MetaAdAccount[] = [];
  for (const row of payload?.data ?? []) {
    const id = row.id?.trim();
    if (!id) continue;
    out.push({ id, name: row.name?.trim() || 'Cuenta publicitaria' });
  }
  return out;
}
