export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import BookingWizard from '@/components/booking/BookingWizard';
import { bookingErrorMessage, loadBookingCatalog } from '@/lib/booking/server';
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

/** Misma UI embebible (iframe / widget web del salón / ads). */
export default async function EmbedBookingPage({ params, searchParams }: Props) {
  const slug = decodeURIComponent(params.slug).toLowerCase();
  const cat = await loadBookingCatalog(slug);
  const preset = parseBookingPreset(searchParams);

  if (!cat.ok) {
    return (
      <div className="flex min-h-[360px] items-center justify-center bg-white px-4">
        <p className="text-center text-body text-ink-2">{bookingErrorMessage(cat.code)}</p>
      </div>
    );
  }

  return (
    <BookingWizard
      slug={slug}
      salon={cat.salon}
      services={cat.services}
      providers={cat.providers}
      presetServiceId={preset.serviceId}
      presetProviderId={preset.providerId}
      embed
    />
  );
}
