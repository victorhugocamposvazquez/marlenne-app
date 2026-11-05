import { requireRole } from '@/lib/require-session';
import { listServices, listStaff } from '@/lib/queries';
import { loadMarketingBrand } from '@/app/actions/marketing';
import { createClient } from '@/lib/supabase/server';
import { servicesToWebCatalog, staffToWebTeam } from '@/lib/web/from-salon';
import WebStudioHost from '@/components/web/WebStudioHost';

export default async function MarketingWebPage() {
  await requireRole('admin');
  const [brand, services, staff] = await Promise.all([
    loadMarketingBrand(),
    listServices({ includeInactive: false }),
    listStaff({ includeInactive: false }),
  ]);

  const sb = createClient();
  let row: { phone?: string | null; fiscal_address?: string | null } | null = null;
  {
    const first = await sb.from('salons').select('phone, fiscal_address').eq('id', brand.salonId).maybeSingle();
    if (first.error && /fiscal_address/i.test(first.error.message)) {
      const retry = await sb.from('salons').select('phone').eq('id', brand.salonId).maybeSingle();
      row = retry.data as typeof row;
    } else {
      row = first.data as typeof row;
    }
  }
  const providers = staff.filter(s => s.role === 'provider' || s.role === 'admin');

  return (
    <div className="h-0 min-h-0 flex-1 overflow-hidden bg-[#F6F6F9]">
      <WebStudioHost
        salon={brand.salonName}
        logo={brand.logoUrl}
        brandColor={brand.accent}
        phone={row?.phone ?? null}
        address={row?.fiscal_address ?? null}
        bookingUrl={brand.bookingUrl}
        services={servicesToWebCatalog(services)}
        team={staffToWebTeam(providers)}
      />
    </div>
  );
}
