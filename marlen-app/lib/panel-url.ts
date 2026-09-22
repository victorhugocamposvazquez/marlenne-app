/** URL del panel SaaS desacoplado (subdominio ops). */
export function panelUrl(path = '/') {
  const base = (
    process.env.NEXT_PUBLIC_PANEL_URL
    ?? process.env.PANEL_URL
    ?? 'http://localhost:3001'
  ).replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
