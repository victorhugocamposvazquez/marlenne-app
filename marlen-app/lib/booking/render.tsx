import BookingWizard from '@/components/booking/BookingWizard';
import { bookingErrorMessage } from '@/lib/booking/server';
import {
  resolveBookingProviderId,
  resolveBookingServiceId,
} from '@/lib/booking/resolve';
import type { BookingCatalog, BookingFail, BookingLink } from '@/lib/booking/types';
import type { BookingLinkPreset } from '@/lib/booking/urls';

export function bookingUnavailable(code: string, embed = false) {
  if (embed) {
    return (
      <div className="flex min-h-[360px] items-center justify-center bg-white px-4">
        <p className="text-center text-body text-ink-2">{bookingErrorMessage(code)}</p>
      </div>
    );
  }
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-surface-soft px-6">
      <div className="max-w-sm text-center">
        <p className="text-title font-bold text-ink">Reserva no disponible</p>
        <p className="mt-2 text-body text-ink-2">{bookingErrorMessage(code)}</p>
      </div>
    </div>
  );
}

export function renderBookingWizard({
  salonSlug,
  catalog,
  preset,
  pathServiceSlug,
  bookingLink = null,
  embed = false,
}: {
  salonSlug: string;
  catalog: BookingCatalog | BookingFail;
  preset: BookingLinkPreset;
  pathServiceSlug?: string | null;
  bookingLink?: BookingLink | null;
  embed?: boolean;
}) {
  if (!catalog.ok) return bookingUnavailable(catalog.code, embed);

  const serviceKey =
    bookingLink?.service_id
    || pathServiceSlug
    || preset.serviceSlug
    || preset.serviceId;
  const providerKey =
    bookingLink?.provider_id
    || preset.providerSlug
    || preset.providerId;
  const serviceId = resolveBookingServiceId(catalog.services, serviceKey);
  const providerId = resolveBookingProviderId(catalog.providers, providerKey);
  const customTitle = bookingLink?.custom_title || preset.title;

  return (
    <BookingWizard
      slug={salonSlug}
      salon={catalog.salon}
      services={catalog.services}
      providers={catalog.providers}
      presetServiceId={serviceId}
      presetProviderId={providerId}
      customTitle={customTitle}
      bookingLink={bookingLink}
      embed={embed}
    />
  );
}
