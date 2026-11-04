import { requireRole } from '@/lib/require-session';
import { listSalonPackTemplates, listServices, listStaff } from '@/lib/queries';
import { loadMarketingBrand } from '@/app/actions/marketing';
import { buildMarketingCatalog } from '@/lib/marketing/catalog';
import MarketingStudioHost from '@/components/marketing/MarketingStudioHost';

export default async function MarketingPage() {
  await requireRole('admin');
  const [brand, packs, services, staff] = await Promise.all([
    loadMarketingBrand(),
    listSalonPackTemplates(),
    listServices({ includeInactive: false }),
    listStaff({ includeInactive: false }),
  ]);

  const providers = staff.filter(s => s.role === 'provider' || s.role === 'admin');
  const catalog = buildMarketingCatalog({
    salonName: brand.salonName,
    bookingSlug: brand.bookingSlug,
    origin: brand.origin,
    packs: packs.filter(p => p.is_active),
    services,
    staff: providers,
  });

  return (
    <div className="h-0 min-h-0 flex-1 overflow-hidden bg-[#F6F6F9]">
      <MarketingStudioHost
        salon={brand.salonName}
        logo={brand.logoUrl}
        brandColor={brand.accent}
        bookingLink={brand.bookingUrl}
        catalog={catalog}
      />
    </div>
  );
}
