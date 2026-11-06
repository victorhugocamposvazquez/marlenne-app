import { requireRole } from '@/lib/require-session';
import { listServices, listStaff } from '@/lib/queries';
import { loadMarketingBrand } from '@/app/actions/marketing';
import { loadSalonSite } from '@/app/actions/salon-site';
import { createClient } from '@/lib/supabase/server';
import { servicesToWebCatalog, staffToWebTeam } from '@/lib/web/from-salon';
import WebStudioHost from '@/components/web/WebStudioHost';

type SalonContact = {
  phone: string | null;
  fiscal_address: string | null;
};

export default async function MarketingWebPage() {
  await requireRole('admin');
  const [brand, services, staff, initialSite] = await Promise.all([
    loadMarketingBrand(),
    listServices({ includeInactive: false }),
    listStaff({ includeInactive: false }),
    loadSalonSite(),
  ]);

  const sb = createClient();
  let contact: SalonContact = { phone: null, fiscal_address: null };
  {
    const first = await sb
      .from('salons')
      .select('phone, fiscal_address')
      .eq('id', brand.salonId)
      .maybeSingle();
    if (first.error && /fiscal_address/i.test(first.error.message)) {
      const retry = await sb.from('salons').select('phone').eq('id', brand.salonId).maybeSingle();
      const data = retry.data as { phone?: string | null } | null;
      contact = { phone: data?.phone ?? null, fiscal_address: null };
    } else {
      const data = first.data as Partial<SalonContact> | null;
      contact = {
        phone: data?.phone ?? null,
        fiscal_address: data?.fiscal_address ?? null,
      };
    }
  }
  const providers = staff.filter(s => s.role === 'provider' || s.role === 'admin');

  return (
    <div className="h-0 min-h-0 flex-1 overflow-hidden bg-[#F6F6F9]">
      <WebStudioHost
        salonId={brand.salonId}
        salon={brand.salonName}
        logo={brand.logoUrl}
        brandColor={brand.accent}
        phone={contact.phone}
        address={contact.fiscal_address}
        bookingUrl={brand.bookingUrl}
        services={servicesToWebCatalog(services)}
        team={staffToWebTeam(providers)}
        initialSite={initialSite}
      />
    </div>
  );
}
