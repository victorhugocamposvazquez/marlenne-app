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

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug).toLowerCase();
  const cat = await loadBookingCatalog(slug);
  const preset = parseBookingPreset(searchParams);
  if (!cat.ok) {
    return { title: `Reservar · ${BRAND_NAME}`, robots: { index: false } };
  }
  const headline = preset.title
    ?? cat.services.find(s => s.id === preset.serviceId)?.name
    ?? `Reservar en ${cat.salon.name}`;
  return {
    title: `${headline} · ${BRAND_NAME}`,
    description: cat.salon.intro ?? `Pide cita online en ${cat.salon.name}`,
  };
}

export default async function PublicBookingPage({ params, searchParams }: Props) {
  const slug = decodeURIComponent(params.slug).toLowerCase();
  const cat = await loadBookingCatalog(slug);
  const preset = parseBookingPreset(searchParams);

  if (!cat.ok) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-surface-soft px-6">
        <div className="max-w-sm text-center">
          <p className="text-title font-bold text-ink">Reserva no disponible</p>
          <p className="mt-2 text-body text-ink-2">{bookingErrorMessage(cat.code)}</p>
        </div>
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
      customTitle={preset.title}
    />
  );
}
