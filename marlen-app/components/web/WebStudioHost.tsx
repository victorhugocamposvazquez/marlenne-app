'use client';

import { useRouter } from 'next/navigation';
import WebStudio from '@/components/web/WebStudio';
import type { Service } from '@/lib/web/types';
import type { SalonSiteRow } from '@/lib/web/site-config';

export default function WebStudioHost({
  salonId,
  salon,
  logo,
  brandColor,
  phone,
  address,
  bookingUrl,
  bookingSlug = null,
  services,
  team,
  initialSite,
}: {
  salonId: string;
  salon: string;
  logo: string | null;
  brandColor: string;
  phone: string | null;
  address: string | null;
  bookingUrl: string;
  bookingSlug?: string | null;
  services: Service[];
  team: [string, string][];
  initialSite: SalonSiteRow | null;
}) {
  const router = useRouter();
  return (
    <WebStudio
      salonId={salonId}
      salon={salon}
      logo={logo || undefined}
      brandColor={brandColor}
      phone={phone}
      address={address}
      bookingUrl={bookingUrl}
      bookingSlug={bookingSlug}
      services={services}
      team={team}
      initialSite={initialSite}
      onBack={() => router.push('/ajustes')}
      onOpenCreatives={() => router.push('/ajustes/marketing')}
    />
  );
}
