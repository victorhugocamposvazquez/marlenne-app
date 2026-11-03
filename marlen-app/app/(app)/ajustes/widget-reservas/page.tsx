import { headers } from 'next/headers';
import AjustesHeader from '@/components/ajustes/AjustesHeader';
import BookingLinksCard from '@/components/ajustes/BookingLinksCard';
import { requireRole } from '@/lib/require-session';
import { createClient } from '@/lib/supabase/server';

type Opt = { id: string; name: string; slug: string | null };

async function loadServices(salonId: string): Promise<Opt[]> {
  const sb = createClient();
  const withSlug = await sb
    .from('services')
    .select('id, name, booking_slug')
    .eq('salon_id', salonId)
    .eq('is_active', true)
    .eq('bookable_online', true)
    .order('sort_order')
    .order('name');
  if (!withSlug.error && withSlug.data) {
    return withSlug.data.map(s => ({
      id: s.id as string,
      name: s.name as string,
      slug: (s.booking_slug as string | null | undefined) ?? null,
    }));
  }
  const fallback = await sb
    .from('services')
    .select('id, name')
    .eq('salon_id', salonId)
    .eq('is_active', true)
    .eq('bookable_online', true)
    .order('sort_order')
    .order('name');
  return (fallback.data ?? []).map(s => ({
    id: s.id as string,
    name: s.name as string,
    slug: null,
  }));
}

async function loadProviders(salonId: string): Promise<Opt[]> {
  const sb = createClient();
  const withSlug = await sb
    .from('staff')
    .select('id, full_name, booking_slug')
    .eq('salon_id', salonId)
    .eq('is_active', true)
    .eq('role', 'provider')
    .order('sort_order')
    .order('full_name');
  if (!withSlug.error && withSlug.data) {
    return withSlug.data.map(p => ({
      id: p.id as string,
      name: p.full_name as string,
      slug: (p.booking_slug as string | null | undefined) ?? null,
    }));
  }
  const fallback = await sb
    .from('staff')
    .select('id, full_name')
    .eq('salon_id', salonId)
    .eq('is_active', true)
    .eq('role', 'provider')
    .order('sort_order')
    .order('full_name');
  return (fallback.data ?? []).map(p => ({
    id: p.id as string,
    name: p.full_name as string,
    slug: null,
  }));
}

export default async function AjustesWidgetReservasPage() {
  const me = await requireRole('admin');
  const sb = createClient();
  const [bookingRes, services, providers] = await Promise.all([
    sb
      .from('salons')
      .select('booking_slug, booking_enabled')
      .eq('id', me.salon_id)
      .maybeSingle(),
    loadServices(me.salon_id),
    loadProviders(me.salon_id),
  ]);
  const booking = bookingRes.error ? null : bookingRes.data;

  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  const origin = `${proto}://${host}`;

  return (
    <AjustesHeader title="Widget reservas">
      <p className="mb-4 text-body leading-snug text-ink-2">
        Calendario completo del centro, o un enlace directo a un solo servicio (con título a medida si quieres).
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
