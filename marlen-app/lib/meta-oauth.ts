/** Inicio de sesión de Meta. Sin DOM ni next: la URL y lo que devuelve Graph. */

export const META_OAUTH_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_metadata',
  'leads_retrieval',
  'ads_read',
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

export function metaAuthUrl(input: { appId: string; redirectUri: string; state: string }) {
  const url = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  url.searchParams.set('client_id', input.appId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('state', input.state);
  url.searchParams.set('scope', META_OAUTH_SCOPES.join(','));
  url.searchParams.set('response_type', 'code');
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
