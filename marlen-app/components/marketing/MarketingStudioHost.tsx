'use client';

import { useRouter } from 'next/navigation';
import MarketingStudio from '@/components/marketing/MarketingStudio';
import { setActiveCatalog } from '@/lib/marketing/data';
import { isAllowedBrandImageUrl, stockProxyPath } from '@/lib/marketing/stock';
import type { CreativeType } from '@/lib/marketing/types';
import type { ClientOption, ServiceOption } from '@/lib/types';

function logoForCanvas(logo: string | null): string | undefined {
  if (!logo) return undefined;
  // Same-origin proxy → html-to-image / canvas no fallan por CORS del Storage.
  if (isAllowedBrandImageUrl(logo)) return stockProxyPath(logo);
  return logo;
}

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
      logo={logoForCanvas(logo)}
      brandColor={brandColor}
      bookingLink={bookingLink}
      catalog={catalog}
      clients={clients}
      services={services}
      onBack={() => router.push('/ajustes')}
    />
  );
}
