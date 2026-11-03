export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { renderBookingWizard, bookingUnavailable } from '@/lib/booking/render';
import { loadBookingCatalog, loadBookingLink } from '@/lib/booking/server';
import { BRAND_NAME } from '@/lib/brand';

type Props = {
  params: { slug: string; linkKey: string };
  searchParams: Record<string, string | string[] | undefined>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug).toLowerCase();
  const linkKey = decodeURIComponent(params.linkKey).toLowerCase();
  const [cat, lr] = await Promise.all([
    loadBookingCatalog(slug),
    loadBookingLink(slug, linkKey),
  ]);
  if (!cat.ok || !lr.ok) {
    return { title: `Reservar · ${BRAND_NAME}`, robots: { index: false } };
  }
  const headline =
    lr.link.custom_title
    ?? cat.services.find(s => s.id === lr.link.service_id)?.name
    ?? `Reservar en ${cat.salon.name}`;
  return {
    title: `${headline} · ${BRAND_NAME}`,
    description: cat.salon.intro ?? `Pide cita online en ${cat.salon.name}`,
  };
}

export default async function PublicBookingLinkPage({ params, searchParams }: Props) {
  const slug = decodeURIComponent(params.slug).toLowerCase();
  const linkKey = decodeURIComponent(params.linkKey).toLowerCase();
  const [cat, lr] = await Promise.all([
    loadBookingCatalog(slug),
    loadBookingLink(slug, linkKey),
  ]);
  if (!lr.ok) return bookingUnavailable(lr.code);

  const paid = typeof searchParams.paid === 'string' ? searchParams.paid : null;
  const intent =
    typeof searchParams.intent === 'string' ? searchParams.intent : null;

  // Si vuelve de Stripe con paid=1, intentar fulfill por si el webhook aún no llegó.
  if (paid === '1' && intent) {
    const { fulfillPaidBookingIntent } = await import('@/lib/booking/fulfill');
    await fulfillPaidBookingIntent({ intentId: intent, bookingSlug: slug });
  }

  return renderBookingWizard({
    salonSlug: slug,
    catalog: cat,
    preset: { linkKey, title: lr.link.custom_title },
    bookingLink: lr.link,
  });
}
