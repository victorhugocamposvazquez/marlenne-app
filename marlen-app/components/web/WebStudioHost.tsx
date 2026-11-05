'use client';

import { useRouter } from 'next/navigation';
import WebStudio from '@/components/web/WebStudio';
import type { Service } from '@/lib/web/types';

export default function WebStudioHost({
  salon,
  logo,
  brandColor,
  phone,
  address,
  bookingUrl,
  services,
  team,
}: {
  salon: string;
  logo: string | null;
  brandColor: string;
  phone: string | null;
  address: string | null;
  bookingUrl: string;
  services: Service[];
  team: [string, string][];
}) {
  const router = useRouter();
  return (
    <WebStudio
      salon={salon}
      logo={logo || undefined}
      brandColor={brandColor}
      phone={phone}
      address={address}
      bookingUrl={bookingUrl}
      services={services}
      team={team}
      onBack={() => router.push('/ajustes')}
      onOpenCreatives={() => router.push('/ajustes/marketing')}
    />
  );
}
