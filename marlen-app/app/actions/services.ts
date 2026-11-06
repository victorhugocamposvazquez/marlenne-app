'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/queries';
import { categorySlug } from '@/lib/categories';
import { createClient } from '@/lib/supabase/server';
import { parseSiteConfig } from '@/lib/web/site-config';

function bump() {
  revalidatePath('/ajustes', 'layout');
  revalidatePath('/agenda');
  revalidatePath('/hoy');
  revalidatePath('/ajustes/marketing/web');
  revalidatePath('/r', 'layout');
  revalidatePath('/embed', 'layout');
}

/** Mantiene el toggle de la web alineado con bookable_online. */
async function syncSiteBookFlag(
  sb: ReturnType<typeof createClient>,
  salonId: string,
  serviceId: string,
  book: boolean,
) {
  const { data } = await sb
    .from('salon_sites')
    .select('id, config')
    .eq('salon_id', salonId)
    .maybeSingle();
  if (!data) return;
  const config = parseSiteConfig(data.config);
  if (!config.svcs?.length) return;
  let changed = false;
  const svcs = config.svcs.map(s => {
    if (s.id !== serviceId || s.book === book) return s;
    changed = true;
    return { ...s, book };
  });
  if (!changed) return;
  await sb
    .from('salon_sites')
    .update({ config: { ...config, svcs }, updated_at: new Date().toISOString() })
    .eq('id', (data as { id: string }).id);
  revalidatePath('/s', 'layout');
}

async function requireAdmin() {
  const me = await getSession();
  if (!me || me.role !== 'admin') return null;
  return me;
}

async function uniqueSlug(sb: ReturnType<typeof createClient>, salonId: string, name: string, exceptId?: string) {
  const base = categorySlug(name);
  let slug = base;
  for (let i = 2; i < 30; i++) {
    let q = sb.from('service_categories').select('id').eq('salon_id', salonId).eq('slug', slug);
    if (exceptId) q = q.neq('id', exceptId);
    const { data } = await q.maybeSingle();
    if (!data) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createCategory(input: { name: string; color: string; opens_treatment?: boolean }) {
  const me = await requireAdmin();
  if (!me) return { ok: false, error: 'Solo dirección' };
  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: 'Pon un nombre de categoría' };
  const sb = createClient();
  const slug = await uniqueSlug(sb, me.salon_id, name);
  const { data: last } = await sb
    .from('service_categories')
    .select('sort_order')
    .eq('salon_id', me.salon_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await sb.from('service_categories').insert({
    salon_id: me.salon_id,
    slug,
    name,
    color: input.color,
    sort_order: (last?.sort_order ?? 0) + 10,
    is_active: true,
    opens_treatment: input.opens_treatment !== false,
  });
  bump();
  return { ok: !error, error: error?.message ?? null };
}

export async function updateCategory(input: {
  id: string;
  name: string;
  color: string;
  opens_treatment: boolean;
}) {
  const me = await requireAdmin();
  if (!me) return { ok: false, error: 'Solo dirección' };
  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: 'Pon un nombre de categoría' };
  const sb = createClient();
  const { error } = await sb.from('service_categories').update({
    name,
    color: input.color,
    opens_treatment: input.opens_treatment,
  }).eq('id', input.id).eq('salon_id', me.salon_id);
  bump();
  return { ok: !error, error: error?.message ?? null };
}

export async function deleteCategory(id: string) {
  const me = await requireAdmin();
  if (!me) return { ok: false, error: 'Solo dirección' };
  const sb = createClient();
  const { count } = await sb.from('services').select('id', { count: 'exact', head: true }).eq('category_id', id);
  if ((count ?? 0) > 0) {
    return { ok: false, error: 'Mueve o quita los servicios de esta categoría antes de borrarla' };
  }
  const { error } = await sb.from('service_categories').delete().eq('id', id).eq('salon_id', me.salon_id);
  bump();
  return { ok: !error, error: error?.message ?? null };
}

/** Flags de reserva online para alinear el editor de web con Ajustes → Tratamientos. */
export async function listServiceBookFlags(): Promise<Record<string, boolean>> {
  const me = await requireAdmin();
  if (!me) return {};
  const sb = createClient();
  const { data } = await sb
    .from('services')
    .select('id, bookable_online')
    .eq('salon_id', me.salon_id)
    .eq('is_active', true);
  const out: Record<string, boolean> = {};
  for (const row of data ?? []) {
    const r = row as { id: string; bookable_online?: boolean };
    out[r.id] = r.bookable_online !== false;
  }
  return out;
}

/** Cambia solo la visibilidad en el calendario público (agenda ↔ web). */
export async function setServiceBookableOnline(id: string, bookable: boolean) {
  const me = await requireAdmin();
  if (!me) return { ok: false, error: 'Solo dirección' };
  const sb = createClient();
  const { error } = await sb
    .from('services')
    .update({ bookable_online: bookable })
    .eq('id', id)
    .eq('salon_id', me.salon_id);
  if (!error) await syncSiteBookFlag(sb, me.salon_id, id, bookable);
  bump();
  return { ok: !error, error: error?.message ?? null };
}

export async function createService(input: {
  name: string;
  category_id: string;
  duration_min: number;
  price_cents: number;
  color?: string | null;
  bookable_online?: boolean;
}) {
  const me = await requireAdmin();
  if (!me) return { ok: false, error: 'Solo dirección' };
  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: 'Pon el nombre del servicio' };
  if (input.duration_min <= 0 || input.price_cents < 0) {
    return { ok: false, error: 'Duración y precio tienen que ser válidos' };
  }
  const sb = createClient();
  const { data: last } = await sb
    .from('services')
    .select('sort_order')
    .eq('salon_id', me.salon_id)
    .eq('category_id', input.category_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const bookable = input.bookable_online !== false;
  const { error } = await sb.from('services').insert({
    salon_id: me.salon_id,
    name,
    category_id: input.category_id,
    duration_min: input.duration_min,
    price_cents: input.price_cents,
    color: input.color || null,
    is_active: true,
    bookable_online: bookable,
    sort_order: (last?.sort_order ?? 0) + 10,
  });
  bump();
  return { ok: !error, error: error?.message ?? null };
}

export async function updateService(input: {
  id: string;
  name?: string;
  category_id?: string;
  duration_min: number;
  price_cents: number;
  is_active: boolean;
  color?: string | null;
  bookable_online?: boolean;
}) {
  const me = await requireAdmin();
  if (!me) return { ok: false, error: 'Solo dirección' };
  if (input.duration_min <= 0 || input.price_cents < 0) {
    return { ok: false, error: 'Duración y precio tienen que ser válidos' };
  }
  const name = input.name?.trim();
  if (name !== undefined && name.length < 2) return { ok: false, error: 'Pon el nombre del servicio' };
  const sb = createClient();
  const bookable = input.bookable_online !== false;
  const { error } = await sb.from('services').update({
    ...(name ? { name } : {}),
    ...(input.category_id ? { category_id: input.category_id } : {}),
    duration_min: input.duration_min,
    price_cents: input.price_cents,
    is_active: input.is_active,
    bookable_online: bookable,
    ...(input.color !== undefined ? { color: input.color || null } : {}),
  }).eq('id', input.id).eq('salon_id', me.salon_id);
  if (!error) await syncSiteBookFlag(sb, me.salon_id, input.id, bookable);
  bump();
  return { ok: !error, error: error?.message ?? null };
}

export async function deleteService(id: string) {
  const me = await requireAdmin();
  if (!me) return { ok: false, error: 'Solo dirección' };
  const sb = createClient();
  const { error } = await sb.from('services').delete().eq('id', id);
  if (!error) {
    bump();
    return { ok: true, error: null };
  }
  const { error: hide } = await sb.from('services').update({ is_active: false }).eq('id', id);
  bump();
  if (hide) return { ok: false, error: 'No se ha podido quitar. Oculta el servicio en la agenda.' };
  return { ok: true, error: null };
}
