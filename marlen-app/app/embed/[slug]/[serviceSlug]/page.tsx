export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { renderBookingWizard } from '@/lib/booking/render';
import { loadBookingCatalog } from '@/lib/booking/server';
import { parseBookingPreset } from '@/lib/booking/urls';
import { BRAND_NAME } from '@/lib/brand';

type Props = {
  params: { slug: string; serviceSlug: string };
  searchParams: Record<string, string | string[] | undefined>;
};

export const metadata: Metadata = {
  title: `Reservar · ${BRAND_NAME}`,
  robots: { index: false, follow: false },
};

export default async function EmbedServiceBookingPage({ params, searchParams }: Props) {
  const salonSlug = decodeURIComponent(params.slug).toLowerCase();
  const serviceSlug = decodeURIComponent(params.serviceSlug).toLowerCase();
  const cat = await loadBookingCatalog(salonSlug);
  const preset = parseBookingPreset(searchParams);
  return renderBookingWizard({
    salonSlug,
    catalog: cat,
    preset,
    pathServiceSlug: serviceSlug,
    embed: true,
    themeOverride: preset.theme,
  });
}
