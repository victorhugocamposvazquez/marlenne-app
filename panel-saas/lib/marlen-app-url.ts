/** PWA del salón (misma BD que el panel en Live). */
export function marlenAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_MARLEN_APP_URL?.trim()
    ?? 'https://marlenne-app.vercel.app';
  return raw.replace(/\/$/, '');
}

export function supportAppPath(
  companyName: string,
  opsEmail: string,
  path = '/agenda',
): string {
  const q = new URLSearchParams({
    ops_support: '1',
    ops_company: companyName,
    ops_by: opsEmail,
  });
  return `${marlenAppUrl()}${path}?${q.toString()}`;
}
