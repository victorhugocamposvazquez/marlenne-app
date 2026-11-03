export const dynamic = 'force-dynamic';

import { renderBookingWizard, bookingUnavailable } from '@/lib/booking/render';
import { loadBookingCatalog, loadBookingLink } from '@/lib/booking/server';
import { fulfillPaidBookingIntent } from '@/lib/booking/fulfill';

type Props = {
  params: { slug: string; linkKey: string };
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function EmbedBookingLinkPage({ params, searchParams }: Props) {
  const slug = decodeURIComponent(params.slug).toLowerCase();
  const linkKey = decodeURIComponent(params.linkKey).toLowerCase();
  const [cat, lr] = await Promise.all([
    loadBookingCatalog(slug),
    loadBookingLink(slug, linkKey),
  ]);
  if (!lr.ok) return bookingUnavailable(lr.code, true);

  const paid = typeof searchParams.paid === 'string' ? searchParams.paid : null;
  const intent =
    typeof searchParams.intent === 'string' ? searchParams.intent : null;
  if (paid === '1' && intent) {
    await fulfillPaidBookingIntent({ intentId: intent, bookingSlug: slug });
  }

  return renderBookingWizard({
    salonSlug: slug,
    catalog: cat,
    preset: { linkKey, title: lr.link.custom_title },
    bookingLink: lr.link,
    embed: true,
  });
}
