'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/queries';
import { categorySlug } from '@/lib/categories';
import { createClient } from '@/lib/supabase/server';

function bump() {
  revalidatePath('/ajustes', 'layout');
  revalidatePath('/agenda');
  revalidatePath('/hoy');
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

export async function createService(input: {
  name: string;
  category_id: string;
  duration_min: number;
  price_cents: number;
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
  const { error } = await sb.from('services').insert({
    salon_id: me.salon_id,
    name,
    category_id: input.category_id,
    duration_min: input.duration_min,
    price_cents: input.price_cents,
    is_active: true,
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
}) {
  const me = await requireAdmin();
  if (!me) return { ok: false, error: 'Solo dirección' };
  if (input.duration_min <= 0 || input.price_cents < 0) {
    return { ok: false, error: 'Duración y precio tienen que ser válidos' };
  }
  const name = input.name?.trim();
  if (name !== undefined && name.length < 2) return { ok: false, error: 'Pon el nombre del servicio' };
  const sb = createClient();
  const { error } = await sb.from('services').update({
    ...(name ? { name } : {}),
    ...(input.category_id ? { category_id: input.category_id } : {}),
    duration_min: input.duration_min,
    price_cents: input.price_cents,
    is_active: input.is_active,
  }).eq('id', input.id);
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
