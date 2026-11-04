import { requireRole } from '@/lib/require-session';
import { listSalonPackTemplates, listServices, listStaff } from '@/lib/queries';
import {
  listMarketingCreatives,
  loadMarketingBrand,
} from '@/app/actions/marketing';
import AjustesHeader from '@/components/ajustes/AjustesHeader';
import MarketingHub from '@/components/marketing/MarketingHub';

export default async function MarketingPage() {
  const me = await requireRole('admin');
  const [brand, creatives, packs, services, staff] = await Promise.all([
    loadMarketingBrand(),
    listMarketingCreatives(),
    listSalonPackTemplates(),
    listServices({ includeInactive: false }),
    listStaff({ includeInactive: false }),
  ]);

  const providers = staff.filter(s => s.role === 'provider' || s.role === 'admin');

  return (
    <AjustesHeader title="Marketing">
      <MarketingHub
        salonId={me.salon_id}
        brand={brand}
        creatives={creatives}
        packs={packs.filter(p => p.is_active)}
        services={services}
        staff={providers}
      />
    </AjustesHeader>
  );
}
