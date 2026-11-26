/** Pide a Meta que avise a la app en cuanto entre un lead de esta página. */

const GRAPH = 'https://graph.facebook.com/v21.0';

export async function subscribePageToLeadgen(pageId: string, token: string) {
  const id = pageId.trim();
  const access = token.trim();
  if (!id || !access) return false;
  const url = new URL(`${GRAPH}/${encodeURIComponent(id)}/subscribed_apps`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      subscribed_fields: 'leadgen',
      access_token: access,
    }),
    cache: 'no-store',
  });
  return res.ok;
}
