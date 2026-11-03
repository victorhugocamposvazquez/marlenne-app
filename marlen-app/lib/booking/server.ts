import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  BookingCatalog,
  BookingConfirm,
  BookingFail,
  BookingSlot,
} from '@/lib/booking/types';
import { publicLogoUrl } from '@/lib/salon-branding';

/** Anon primero (RPCs SECURITY DEFINER); si falla el grant, service role. */
function bookingDb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL');
  const key = anon || service;
  if (!key) throw new Error('Falta clave Supabase en el servidor');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function bookingDbAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return bookingDb();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const FAIL = (code: string, message?: string): BookingFail => ({ ok: false, code, message });

async function rpcCatalog(slug: string, db: SupabaseClient) {
  return db.rpc('booking_catalog', { p_slug: slug });
}

export async function loadBookingCatalog(slug: string): Promise<BookingCatalog | BookingFail> {
  const normalized = slug.trim().toLowerCase();
  let { data, error } = await rpcCatalog(normalized, bookingDb());
  // Reintento con service role si anon no ve la función o el slug.
  if (error || !(data as { ok?: boolean } | null)?.ok) {
    const retry = await rpcCatalog(normalized, bookingDbAdmin());
    if (!retry.error && (retry.data as { ok?: boolean } | null)?.ok) {
      data = retry.data;
      error = null;
    } else if (!data && retry.data) {
      data = retry.data;
      error = retry.error;
    }
  }
  if (error) {
    console.error('[booking_catalog]', normalized, error.message);
    return FAIL('rpc', error.message);
  }
  const row = data as (BookingCatalog | BookingFail) | null;
  if (!row || typeof row !== 'object') return FAIL('not_found');
  if (!row.ok) return row;
  const salon = {
    ...row.salon,
    logo_url: publicLogoUrl(row.salon.logo_path) ?? row.salon.logo_url ?? null,
  };
  return {
    ...row,
    salon,
    providers: Array.isArray(row.providers) ? row.providers : [],
    services: Array.isArray(row.services) ? row.services : [],
  };
}

export async function loadMonthDays(
  slug: string,
  serviceId: string,
  year: number,
  month: number,
  providerId?: string | null,
): Promise<{ ok: true; days: string[] } | BookingFail> {
  const { data, error } = await bookingDb().rpc('booking_month_days', {
    p_slug: slug,
    p_service_id: serviceId,
    p_year: year,
    p_month: month,
    p_provider_id: providerId ?? null,
  });
  if (error) return FAIL('rpc', error.message);
  const row = data as { ok: boolean; days?: string[]; code?: string } | null;
  if (!row?.ok) return FAIL(row?.code ?? 'not_found');
  return { ok: true, days: row.days ?? [] };
}

export async function loadDaySlots(
  slug: string,
  serviceId: string,
  date: string,
  providerId?: string | null,
): Promise<{ ok: true; slots: BookingSlot[] } | BookingFail> {
  const { data, error } = await bookingDb().rpc('booking_day_slots', {
    p_slug: slug,
    p_service_id: serviceId,
    p_date: date,
    p_provider_id: providerId ?? null,
  });
  if (error) return FAIL('rpc', error.message);
  const row = data as { ok: boolean; slots?: BookingSlot[]; code?: string } | null;
  if (!row?.ok) return FAIL(row?.code ?? 'not_found');
  return { ok: true, slots: row.slots ?? [] };
}

export async function createPublicBooking(input: {
  slug: string;
  serviceId: string;
  startsAt: string;
  fullName: string;
  phone: string;
  email?: string;
  note?: string;
  providerId?: string | null;
}): Promise<BookingConfirm | BookingFail> {
  const { data, error } = await bookingDb().rpc('booking_create', {
    p_slug: input.slug,
    p_service_id: input.serviceId,
    p_starts_at: input.startsAt,
    p_full_name: input.fullName,
    p_phone: input.phone,
    p_email: input.email ?? null,
    p_note: input.note ?? null,
    p_provider_id: input.providerId ?? null,
  });
  if (error) return FAIL('rpc', error.message);
  const row = data as BookingConfirm | BookingFail | null;
  if (!row || typeof row !== 'object') return FAIL('create');
  if (row.ok) {
    const { afterPublicBookingCreated } = await import('@/lib/booking/notify');
    void afterPublicBookingCreated(row);
  }
  return row;
}

export async function loadBookingLink(
  slug: string,
  linkKey: string,
): Promise<{ ok: true; link: import('@/lib/booking/types').BookingLink } | BookingFail> {
  const { data, error } = await bookingDb().rpc('booking_link_by_key', {
    p_salon_slug: slug.trim().toLowerCase(),
    p_link_key: linkKey.trim().toLowerCase(),
  });
  if (error) return FAIL('rpc', error.message);
  const row = data as
    | { ok: true; link: import('@/lib/booking/types').BookingLink }
    | BookingFail
    | null;
  if (!row || typeof row !== 'object') return FAIL('link');
  if (!row.ok) return row;
  return row;
}

export function bookingErrorMessage(code: string) {
  switch (code) {
    case 'not_found':
      return 'Este enlace de reserva no está disponible.';
    case 'link':
      return 'Este enlace de anuncio no está activo.';
    case 'service':
      return 'Ese servicio ya no se puede reservar.';
    case 'overlap':
      return 'Ese hueco acaba de ocuparse. Elige otra hora.';
    case 'phone':
      return 'Introduce un móvil español válido.';
    case 'name':
      return 'Indica tu nombre completo.';
    case 'past':
      return 'Esa hora ya ha pasado.';
    case 'range':
      return 'Fuera del periodo reservable.';
    case 'provider':
      return 'Esa profesional no está disponible.';
    case 'stripe':
      return 'No se ha podido abrir el pago con tarjeta.';
    default:
      return 'No se ha podido completar la reserva. Prueba de nuevo.';
  }
}
