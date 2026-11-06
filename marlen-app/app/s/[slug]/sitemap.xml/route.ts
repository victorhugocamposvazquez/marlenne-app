import { NextResponse } from 'next/server';
import { loadPublishedSalonSite } from '@/app/actions/salon-site';
import { publicSiteUrl, normalizeSiteSlug } from '@/lib/web/site-urls';

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await ctx.params;
  const slug = normalizeSiteSlug(raw);
  const site = await loadPublishedSalonSite(slug);
  if (!site) return new NextResponse('Not found', { status: 404 });

  const base = publicSiteUrl(site.slug);
  const urls = [base, `${base}/aviso-legal`, `${base}/privacidad`, `${base}/cookies`];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>`;

  return new NextResponse(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
