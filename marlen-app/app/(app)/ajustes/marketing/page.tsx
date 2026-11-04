import { requireRole } from '@/lib/require-session';
import { listClientOptions, listSalonPackTemplates, listServices } from '@/lib/queries';
import { loadMarketingBrand } from '@/app/actions/marketing';
import { buildMarketingCatalog } from '@/lib/marketing/catalog';
import MarketingStudioHost from '@/components/marketing/MarketingStudioHost';

export default async function MarketingPage() {
  await requireRole('admin');
  const [brand, packs, services, clients] = await Promise.all([
    loadMarketingBrand(),
    listSalonPackTemplates(),
    listServices({ includeInactive: false }),
    listClientOptions(),
  ]);

  const catalog = buildMarketingCatalog({
    salonName: brand.salonName,
    bookingSlug: brand.bookingSlug,
    origin: brand.origin,
    packs: packs.filter(p => p.is_active),
    services,
  });

  return (
    <div className="h-0 min-h-0 flex-1 overflow-hidden bg-[#F6F6F9]">
      <MarketingStudioHost
        salon={brand.salonName}
        logo={brand.logoUrl}
        brandColor={brand.accent}
        bookingLink={brand.bookingUrl}
        catalog={catalog}
        clients={clients}
        services={services}
      />
    </div>
  );
}
