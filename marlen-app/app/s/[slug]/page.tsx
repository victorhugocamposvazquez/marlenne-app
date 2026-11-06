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

export default async function PublicSalonSitePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ gift?: string; order?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const bundle = await loadPublicSiteBundle(slug);
  if (!bundle) notFound();

  return (
    <main style={{ minHeight: '100dvh', background: bundle.props.pal.bg }}>
      {sp.gift === '1' && (
        <div
          style={{
            padding: '14px 20px',
            background: bundle.props.pal.accent,
            color: bundle.props.pal.onAccent,
            textAlign: 'center',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Pago recibido. Te enviamos el código de la tarjeta regalo por email.
        </div>
      )}
      <WebSite {...bundle.props} />
    </main>
  );
}
