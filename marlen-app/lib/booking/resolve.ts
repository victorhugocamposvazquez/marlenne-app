/** Resolver slugs/UUID del booking contra el catálogo. Sin DOM ni next/*. */

import { isBookingUuid, slugifyBooking } from '@/lib/booking/urls';
import type { BookingProvider, BookingService } from '@/lib/booking/types';

function serviceKey(s: BookingService): string {
  return (s.slug || slugifyBooking(s.name)).toLowerCase();
}

function providerKey(p: BookingProvider): string {
  return (p.slug || slugifyBooking(p.name)).toLowerCase();
}

export function resolveBookingServiceId(
  services: BookingService[],
  key: string | null | undefined,
): string | null {
  if (!key) return null;
  const k = key.trim().toLowerCase();
  if (!k) return null;
  if (isBookingUuid(k)) return services.find(s => s.id === k)?.id ?? null;
  return services.find(s => serviceKey(s) === k)?.id ?? null;
}

export function resolveBookingProviderId(
  providers: BookingProvider[],
  key: string | null | undefined,
): string | null {
  if (!key) return null;
  const k = key.trim().toLowerCase();
  if (!k) return null;
  if (isBookingUuid(k)) return providers.find(p => p.id === k)?.id ?? null;
  return providers.find(p => providerKey(p) === k)?.id ?? null;
}

/** Slug estable para compartir: booking_slug o slugify(name). */
export function publicServiceSlug(s: { id: string; name: string; slug?: string | null }): string {
  return (s.slug || slugifyBooking(s.name)).toLowerCase();
}

export function publicProviderSlug(p: { id: string; name: string; slug?: string | null }): string {
  return (p.slug || slugifyBooking(p.name)).toLowerCase();
}
