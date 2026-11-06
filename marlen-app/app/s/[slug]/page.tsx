import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import WebSite from '@/components/web/WebSite';
import { loadPublicSiteBundle } from '@/lib/web/load-public-site';
import { publicSiteUrl } from '@/lib/web/site-urls';

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await loadPublicSiteBundle(slug);
  if (!bundle) return { title: 'Web no encontrada' };
  const zone = bundle.site.config.zone?.trim();
  const title = zone
    ? `${bundle.salonName} | Centro de estética en ${zone}`
    : `${bundle.salonName} | Centro de estética`;
  const desc =
    bundle.props.txt.heroSub ||
    `Servicios, precios y reserva online en ${bundle.salonName}.`;
  return {
    title,
    description: desc,
    openGraph: { title, description: desc, url: publicSiteUrl(bundle.site.slug) },
    robots: { index: true, follow: true },
  };
}

export default async function PublicSalonSitePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const bundle = await loadPublicSiteBundle(slug);
  if (!bundle) notFound();

  return (
    <main style={{ minHeight: '100dvh', background: bundle.props.pal.bg }}>
      <WebSite {...bundle.props} />
    </main>
  );
}
