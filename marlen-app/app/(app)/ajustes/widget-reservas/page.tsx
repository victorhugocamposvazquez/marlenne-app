import { headers } from 'next/headers';
import AjustesHeader from '@/components/ajustes/AjustesHeader';
import BookingLinksCard from '@/components/ajustes/BookingLinksCard';
import { requireRole } from '@/lib/require-session';
import { createClient } from '@/lib/supabase/server';

export default async function AjustesWidgetReservasPage() {
  const me = await requireRole('admin');
  const sb = createClient();
  const bookingRes = await sb
    .from('salons')
    .select('booking_slug, booking_enabled')
    .eq('id', me.salon_id)
    .maybeSingle();

  let servicesRes = await sb
    .from('services')
    .select('id, name, booking_slug')
    .eq('salon_id', me.salon_id)
    .eq('is_active', true)
    .eq('bookable_online', true)
    .order('sort_order')
    .order('name');
  if (servicesRes.error) {
    servicesRes = await sb
      .from('services')
      .select('id, name')
      .eq('salon_id', me.salon_id)
      .eq('is_active', true)
      .eq('bookable_online', true)
      .order('sort_order')
      .order('name');
  }

  let providersRes = await sb
    .from('staff')
    .select('id, full_name, booking_slug')
    .eq('salon_id', me.salon_id)
    .eq('is_active', true)
    .eq('role', 'provider')
    .order('sort_order')
    .order('full_name');
  if (providersRes.error) {
    providersRes = await sb
      .from('staff')
      .select('id, full_name')
      .eq('salon_id', me.salon_id)
      .eq('is_active', true)
      .eq('role', 'provider')
      .order('sort_order')
      .order('full_name');
  }

  const booking = bookingRes.error ? null : bookingRes.data;
  const services = (servicesRes.data ?? []).map(s => ({
    id: s.id as string,
    name: s.name as string,
    slug: ((s as { booking_slug?: string | null }).booking_slug) ?? null,
  }));
  const providers = (providersRes.data ?? []).map(p => ({
    id: p.id as string,
    name: p.full_name as string,
    slug: ((p as { booking_slug?: string | null }).booking_slug) ?? null,
  }));

  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  const origin = `${proto}://${host}`;

  return (
    <AjustesHeader title="Widget reservas">
      <p className="mb-4 text-body leading-snug text-ink-2">
        Calendario público, widgets para anuncios con título a medida, y vista previa aquí mismo.
      </p>
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
