import { headers } from 'next/headers';
import AjustesHeader from '@/components/ajustes/AjustesHeader';
import BookingLinksCard from '@/components/ajustes/BookingLinksCard';
import CentroBrandingForm from '@/components/ajustes/CentroBrandingForm';
import { loadSalonBranding } from '@/app/actions/salon-branding';
import { requireRole } from '@/lib/require-session';
import { createClient } from '@/lib/supabase/server';

export default async function AjustesCentroPage() {
  const me = await requireRole('admin');
  const branding = await loadSalonBranding();
  const sb = createClient();
  const [bookingRes, servicesRes, providersRes] = await Promise.all([
    sb
      .from('salons')
      .select('booking_slug, booking_enabled')
      .eq('id', me.salon_id)
      .maybeSingle(),
    sb
      .from('services')
      .select('id, name')
      .eq('salon_id', me.salon_id)
      .eq('is_active', true)
      .eq('bookable_online', true)
      .order('sort_order')
      .order('name'),
    sb
      .from('staff')
      .select('id, full_name')
      .eq('salon_id', me.salon_id)
      .eq('is_active', true)
      .eq('role', 'provider')
      .order('sort_order')
      .order('full_name'),
  ]);
  const booking = bookingRes.error ? null : bookingRes.data;
  const services = (servicesRes.data ?? []).map(s => ({ id: s.id as string, name: s.name as string }));
  const providers = (providersRes.data ?? []).map(p => ({
    id: p.id as string,
    name: p.full_name as string,
  }));

  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  const origin = `${proto}://${host}`;

  return (
    <AjustesHeader title="Centro">
      <p className="mb-2 text-body leading-snug text-ink-2">
        Nombre, logo y datos fiscales del emisor. Se usan en facturas y en la app.
      </p>
      <CentroBrandingForm initial={branding} salonId={me.salon_id} />
      <BookingLinksCard
        slug={booking?.booking_slug ?? null}
        enabled={!!booking?.booking_enabled}
        origin={origin}
        services={services}
        providers={providers}
      />
    </AjustesHeader>
  );
}
