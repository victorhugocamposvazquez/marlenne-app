'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/require-session';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { appOriginFromEnv } from '@/lib/app-origin';
import { bookingPageUrl, slugifyBooking } from '@/lib/booking/urls';

const RESERVED = new Set([
  'app', 'www', 'api', 'admin', 'mail', 'blog', 'help', 'ayuda', 'status',
  'r', 'cdn', 'static', 'sites', 'marlen', 'marlenapp', 'soporte', 'login',
  'pago', 'pagos', 's', 'panel', 'embed', 'ops', 'auth', 'ajustes',
]);

const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$/;

export function normalizeBookingSlug(raw: string): string {
  return slugifyBooking(raw).slice(0, 64);
}

export function validateBookingSlug(slug: string): { ok: true } | { ok: false; error: string } {
  if (slug.length < 2) return { ok: false, error: 'Mínimo 2 caracteres' };
  if (slug.length > 64) return { ok: false, error: 'Máximo 64 caracteres' };
  if (!SLUG_RE.test(slug)) {
    return { ok: false, error: 'Solo minúsculas, números y guiones (sin empezar ni acabar en guion)' };
  }
  if (RESERVED.has(slug)) {
    return { ok: false, error: 'Ese nombre está reservado. Prueba otro.' };
  }
  return { ok: true };
}

async function isSlugTaken(slug: string, salonId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('salons')
    .select('id')
    .eq('booking_slug', slug)
    .maybeSingle();
  if (!data) return false;
  return (data as { id: string }).id !== salonId;
}

/** Propone un slug libre a partir del nombre del centro. */
export async function suggestBookingSlug(salonName?: string): Promise<
  | { ok: true; slug: string }
  | { ok: false; error: string }
> {
  const me = await requireRole('admin');
  const sb = createClient();
  let name = (salonName || '').trim();
  if (!name) {
    const { data } = await sb.from('salons').select('name').eq('id', me.salon_id).maybeSingle();
    name = ((data as { name?: string } | null)?.name || 'centro').trim();
  }
  let base = normalizeBookingSlug(name) || 'centro';
  if (RESERVED.has(base) || base.length < 2) base = `centro-${base}`.slice(0, 64);

  for (let i = 0; i < 40; i++) {
    const candidate = i === 0 ? base : `${base.slice(0, 60)}-${i + 1}`;
    const v = validateBookingSlug(candidate);
    if (!v.ok) continue;
    if (!(await isSlugTaken(candidate, me.salon_id))) {
      return { ok: true, slug: candidate };
    }
  }
  return { ok: false, error: 'No se pudo generar un nombre libre' };
}

export async function checkBookingSlug(raw: string): Promise<
  | { ok: true; slug: string; available: boolean; message: string }
  | { ok: false; error: string }
> {
  const me = await requireRole('admin');
  const slug = normalizeBookingSlug(raw);
  const v = validateBookingSlug(slug);
  if (!v.ok) return { ok: false, error: v.error };

  const taken = await isSlugTaken(slug, me.salon_id);
  if (taken) {
    return {
      ok: true,
      slug,
      available: false,
      message: `«${slug}» ya está en uso. Prueba ${slug}-madrid`,
    };
  }
  const origin = appOriginFromEnv();
  return {
    ok: true,
    slug,
    available: true,
    message: `✓ ${bookingPageUrl(origin, slug).replace(/^https?:\/\//, '')}`,
  };
}

/** Guarda el slug público y activa la reserva online. */
export async function saveSalonBookingSlug(raw: string): Promise<
  | {
      ok: true;
      slug: string;
      bookingUrl: string;
      bookingEmbedUrl: string;
    }
  | { ok: false; error: string }
> {
  const me = await requireRole('admin');
  const slug = normalizeBookingSlug(raw);
  const v = validateBookingSlug(slug);
  if (!v.ok) return { ok: false, error: v.error };

  if (await isSlugTaken(slug, me.salon_id)) {
    return { ok: false, error: `«${slug}» ya está en uso` };
  }

  const sb = createClient();
  const { error } = await sb
    .from('salons')
    .update({
      booking_slug: slug,
      booking_enabled: true,
    })
    .eq('id', me.salon_id);

  if (error) {
    if (/booking_slug|unique/i.test(error.message)) {
      return { ok: false, error: `«${slug}» ya está en uso` };
    }
    return { ok: false, error: error.message };
  }

  const origin = appOriginFromEnv();
  revalidatePath('/ajustes/marketing/web');
  revalidatePath('/ajustes/widget-reservas');
  revalidatePath('/r', 'layout');
  revalidatePath('/embed', 'layout');

  return {
    ok: true,
    slug,
    bookingUrl: bookingPageUrl(origin, slug),
    // Relativo: funciona en Vercel preview y en app.marlenapp.com
    bookingEmbedUrl: `/embed/${encodeURIComponent(slug)}`,
  };
}
