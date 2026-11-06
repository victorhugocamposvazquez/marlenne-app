import { createAdminClient } from '@/lib/supabase/admin';
import { publicLogoUrl } from '@/lib/salon-branding';
import { bookingPageUrl } from '@/lib/booking/urls';
import { appOriginFromEnv } from '@/lib/app-origin';
import { servicesToWebCatalog, staffToWebTeam } from '@/lib/web/from-salon';
import { buildSiteProps } from '@/lib/web/build-site-props';
import { loadPublishedSalonSite } from '@/app/actions/salon-site';
import type { SiteProps } from '@/lib/web/types';
import type { SalonSiteRow } from '@/lib/web/site-config';
import type { Provider, ServiceOption } from '@/lib/types';

export type PublicSiteBundle = {
  site: SalonSiteRow;
  props: SiteProps;
  salonName: string;
};

export async function loadPublicSiteBundle(slug: string): Promise<PublicSiteBundle | null> {
  const site = await loadPublishedSalonSite(slug);
  if (!site) return null;

  const sb = createAdminClient();
  const { data: salon } = await sb
    .from('salons')
    .select('id, name, logo_path, phone, fiscal_address, booking_slug, booking_accent')
    .eq('id', site.salonId)
    .maybeSingle();

  const row = salon as {
    name?: string | null;
    logo_path?: string | null;
    phone?: string | null;
    fiscal_address?: string | null;
    booking_slug?: string | null;
    booking_accent?: string | null;
  } | null;

  const { data: serviceRows } = await sb
    .from('services')
    .select('id, name, category, duration_min, price_cents, is_active')
    .eq('salon_id', site.salonId)
    .eq('is_active', true)
    .order('sort_order');

  const liveSvcs = servicesToWebCatalog(
    ((serviceRows || []) as {
      id: string;
      name: string;
      category: string;
      duration_min: number;
      price_cents: number;
    }[]).map(
      (s): ServiceOption => ({
        id: s.id,
        name: s.name,
        category: (s.category as ServiceOption['category']) || 'facial',
        duration_min: s.duration_min,
        price_cents: s.price_cents,
        is_active: true,
      }),
    ),
  );

  const { data: staffRows } = await sb
    .from('staff')
    .select('id, full_name, initials, job_title, role, color, is_active')
    .eq('salon_id', site.salonId)
    .eq('is_active', true);

  const team = staffToWebTeam(
    ((staffRows || []) as {
      id: string;
      full_name: string;
      initials: string | null;
      job_title: string | null;
      role: string;
      color: string | null;
    }[])
      .filter(s => s.role === 'provider' || s.role === 'admin')
      .map(
        (s): Provider => ({
          id: s.id,
          full_name: s.full_name,
          initials: s.initials,
          job_title: s.job_title,
          role: s.role as Provider['role'],
          color: s.color,
          is_active: true,
        }),
      ),
  );

  const salonName = (row?.name || '').trim() || 'Centro';
  const origin = appOriginFromEnv();
  const bookingUrl = row?.booking_slug ? bookingPageUrl(origin, row.booking_slug) : undefined;

  const props = buildSiteProps({
    config: site.config,
    salon: salonName,
    logo: publicLogoUrl(row?.logo_path ?? null),
    brandColor: (row?.booking_accent || '').trim() || '#D000A8',
    bookingUrl,
    phone: row?.phone ?? null,
    address: row?.fiscal_address ?? null,
    liveSvcs: liveSvcs.length ? liveSvcs : undefined,
    team,
    siteSlug: site.slug,
    showFloat: true,
  });

  return { site, props, salonName };
}
