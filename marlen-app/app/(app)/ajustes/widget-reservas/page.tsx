import { headers } from 'next/headers';
import AjustesHeader from '@/components/ajustes/AjustesHeader';
import BookingAppearanceCard from '@/components/ajustes/BookingAppearanceCard';
import BookingLinksCard from '@/components/ajustes/BookingLinksCard';
import BookingLinksManager from '@/components/ajustes/BookingLinksManager';
import BookingNotifyCard from '@/components/ajustes/BookingNotifyCard';
import { listBookingLinks } from '@/app/actions/booking-links';
import { requireRole } from '@/lib/require-session';
import { publicLogoUrl } from '@/lib/salon-branding';
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
  const [bookingRes, services, providers, links] = await Promise.all([
    sb
      .from('salons')
      .select(
        'booking_slug, booking_enabled, booking_accent, logo_path, booking_notify_email, booking_sms_reminders',
      )
      .eq('id', me.salon_id)
      .maybeSingle(),
    loadServices(me.salon_id),
    loadProviders(me.salon_id),
    listBookingLinks(),
  ]);

  type BookingRow = {
    booking_slug: string | null;
    booking_enabled: boolean | null;
    booking_accent?: string | null;
    logo_path: string | null;
    booking_notify_email?: string | null;
    booking_sms_reminders?: boolean | null;
  };
  let booking: BookingRow | null = bookingRes.error ? null : (bookingRes.data as BookingRow);
  if (bookingRes.error) {
    const retry = await sb
      .from('salons')
      .select('booking_slug, booking_enabled, logo_path')
      .eq('id', me.salon_id)
      .maybeSingle();
    booking = retry.error || !retry.data
      ? null
      : {
          ...(retry.data as Omit<BookingRow, 'booking_accent' | 'booking_notify_email' | 'booking_sms_reminders'>),
          booking_accent: null,
          booking_notify_email: null,
          booking_sms_reminders: true,
        };
  }

  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  const origin = `${proto}://${host}`;
  const logoUrl = publicLogoUrl(booking?.logo_path ?? null);

  return (
    <AjustesHeader title="Widget reservas">
      <p className="mb-4 text-body leading-snug text-ink-2">
        Calendario completo, enlaces de anuncio con o sin cobro, avisos y apariencia del widget.
      </p>
      <div className="space-y-5">
        <BookingAppearanceCard
          salonId={me.salon_id}
          logoUrl={logoUrl}
          logoPath={booking?.logo_path ?? null}
          initialAccent={booking?.booking_accent ?? null}
        />
        <BookingNotifyCard
          initialEmail={booking?.booking_notify_email ?? null}
          initialSmsReminders={booking?.booking_sms_reminders !== false}
        />
        <BookingLinksManager
          origin={origin}
          salonSlug={booking?.booking_slug ?? null}
          services={services}
          providers={providers}
          initialLinks={links}
        />
        <BookingLinksCard
          slug={booking?.booking_slug ?? null}
          enabled={!!booking?.booking_enabled}
          origin={origin}
          services={services}
          providers={providers}
        />
      </div>
    </AjustesHeader>
  );
}
