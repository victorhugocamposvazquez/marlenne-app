'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function mySalon() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { sb, salonId: null as string | null };
  const { data } = await sb.from('staff').select('salon_id').eq('id', user.id).maybeSingle();
  return { sb, salonId: data?.salon_id ?? null };
}

export async function createClientRecord(input: {
  full_name: string;
  phone?: string;
  email?: string;
  tags?: string[];
}) {
  const name = input.full_name.trim();
  if (name.length < 2) return { ok: false, error: 'Pon al menos el nombre', id: null };
  const { sb, salonId } = await mySalon();
  if (!salonId) return { ok: false, error: 'Sin sesión', id: null };

  const { data, error } = await sb.from('clients').insert({
    salon_id: salonId,
    full_name: name,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    tags: input.tags ?? [],
  }).select('id').single();

  revalidatePath('/clientas');
  return { ok: !error, error: error?.message ?? null, id: data?.id ?? null };
}

export async function addToWaitlist(input: {
  clientId?: string;
  clientName?: string;
  serviceId?: string;
  preference?: string;
}) {
  const { sb, salonId } = await mySalon();
  if (!salonId) return { ok: false, error: 'Sin sesión' };
  if (!input.clientId && !input.clientName?.trim()) {
    return { ok: false, error: 'Indica quién espera' };
  }

  const { error } = await sb.from('waitlist').insert({
    salon_id: salonId,
    client_id: input.clientId ?? null,
    client_name: input.clientId ? null : input.clientName!.trim(),
    service_id: input.serviceId || null,
    preference: input.preference?.trim() || null,
  });

  revalidatePath('/agenda');
  revalidatePath('/hoy');
  return { ok: !error, error: error?.message ?? null };
}

export async function updateClientRecord(input: {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  notes?: string;
  tags?: string[];
  sms_opt_in?: boolean;
}) {
  const name = input.full_name.trim();
  if (name.length < 2) return { ok: false, error: 'Pon al menos el nombre' };
  const { sb, salonId } = await mySalon();
  if (!salonId) return { ok: false, error: 'Sin sesión' };

  const { error } = await sb.from('clients').update({
    full_name: name,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    notes: input.notes?.trim() || null,
    tags: input.tags ?? [],
    sms_opt_in: input.sms_opt_in ?? true,
  }).eq('id', input.id);

  revalidatePath('/clientas');
  revalidatePath(`/clientas/${input.id}`);
  return { ok: !error, error: error?.message ?? null };
}

export async function addConsent(input: { clientId: string; kind: string }) {
  const { sb, salonId } = await mySalon();
  if (!salonId) return { ok: false, error: 'Sin sesión' };
  const { data: { user } } = await sb.auth.getUser();
  const expires = input.kind === 'fotografia'
    ? new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    : null;
  const { error } = await sb.from('consents').insert({
    client_id: input.clientId,
    kind: input.kind,
    taken_by: user?.id ?? null,
    expires_at: expires,
  });
  revalidatePath(`/clientas/${input.clientId}`);
  return { ok: !error, error: error?.message ?? null };
}

export async function resolveWaitlist(id: string) {
  const sb = createClient();
  const { error } = await sb.from('waitlist').update({ resolved_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/agenda');
  revalidatePath('/hoy');
  return { ok: !error, error: error?.message ?? null };
}
