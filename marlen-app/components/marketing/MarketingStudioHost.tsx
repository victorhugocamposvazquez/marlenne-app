'use client';

import { useRouter } from 'next/navigation';
import MarketingStudio from '@/components/marketing/MarketingStudio';
import { setActiveCatalog } from '@/lib/marketing/data';
import type { CreativeType } from '@/lib/marketing/types';
import type { ClientOption, ServiceOption } from '@/lib/types';

export default function MarketingStudioHost({
  salon,
  logo,
  brandColor,
  bookingLink,
  catalog,
  clients,
  services,
}: {
  salon: string;
  logo: string | null;
  brandColor: string;
  bookingLink: string;
  catalog: CreativeType[];
  clients: ClientOption[];
  services: ServiceOption[];
}) {
  const router = useRouter();
  if (catalog.length) setActiveCatalog(catalog);
  return (
    <MarketingStudio
      salon={salon}
      logo={logo || undefined}
      brandColor={brandColor}
      bookingLink={bookingLink}
      catalog={catalog}
      clients={clients}
      services={services}
      onBack={() => router.push('/ajustes')}
    />
  );
}
