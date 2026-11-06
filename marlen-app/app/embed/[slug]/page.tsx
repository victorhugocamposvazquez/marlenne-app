export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { renderBookingWizard } from '@/lib/booking/render';
import { loadBookingCatalog } from '@/lib/booking/server';
import { parseBookingPreset } from '@/lib/booking/urls';
import { BRAND_NAME } from '@/lib/brand';

type Props = {
  params: { slug: string };
  searchParams: Record<string, string | string[] | undefined>;
};

export const metadata: Metadata = {
  title: `Reservar · ${BRAND_NAME}`,
  robots: { index: false, follow: false },
};

export default async function EmbedBookingPage({ params, searchParams }: Props) {
  const slug = decodeURIComponent(params.slug).toLowerCase();
  const cat = await loadBookingCatalog(slug);
  const preset = parseBookingPreset(searchParams);
  return renderBookingWizard({
    salonSlug: slug,
    catalog: cat,
    preset,
    embed: true,
    themeOverride: preset.theme,
  });
}
