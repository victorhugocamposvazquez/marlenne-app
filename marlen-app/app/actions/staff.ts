'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession } from '@/lib/queries';
import { avatarColor } from '@/lib/categories';
import type { StaffRole } from '@/lib/types';

function tempPassword() {
  const a = Math.random().toString(36).slice(2, 6);
  const b = Math.random().toString(36).slice(2, 6);
  return `Mar-${a}${b}`;
}

async function requireAdmin() {
  const me = await getSession();
  if (!me || me.role !== 'admin') return null;
  return me;
}

export async function createMember(input: {
  email: string;
  full_name: string;
  role: StaffRole;
  job_title?: string;
}) {
  const me = await requireAdmin();
  if (!me) return { ok: false, error: 'Solo dirección puede dar de alta', password: null };
  const email = input.email.trim().toLowerCase();
  const name = input.full_name.trim();
  if (!email.includes('@') || name.length < 2) {
    return { ok: false, error: 'Pon nombre y un email válido', password: null };
  }

  const admin = createAdminClient();
  const password = tempPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error || !data.user) {
    return { ok: false, error: error?.message ?? 'No se ha podido crear el usuario', password: null };
  }

  const { data: last } = await admin.from('staff')
    .select('sort_order')
    .eq('salon_id', me.salon_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error: staffErr } = await admin.from('staff').insert({
    id: data.user.id,
    salon_id: me.salon_id,
    full_name: name,
    role: input.role,
    job_title: input.job_title?.trim() || null,
    color: avatarColor(name),
    sort_order: (last?.sort_order ?? 0) + 1,
    is_active: true,
  });
  if (staffErr) return { ok: false, error: staffErr.message, password: null };

  revalidatePath('/ajustes', 'layout');
  revalidatePath('/agenda');
  revalidatePath('/hoy');
  return { ok: true, error: null, password };
}

export async function updateMember(input: {
  id: string;
  full_name: string;
  role: StaffRole;
  job_title?: string;
  is_active: boolean;
}) {
  const me = await requireAdmin();
  if (!me) return { ok: false, error: 'Solo dirección' };
  if (input.id === me.id && !input.is_active) {
    return { ok: false, error: 'No puedes desactivar tu propio acceso' };
  }
  if (input.id === me.id && input.role !== 'admin') {
    return { ok: false, error: 'No puedes quitarte el rol de dirección' };
  }

  const admin = createAdminClient();
  const { error } = await admin.from('staff').update({
    full_name: input.full_name.trim(),
    role: input.role,
    job_title: input.job_title?.trim() || null,
    is_active: input.is_active,
  }).eq('id', input.id).eq('salon_id', me.salon_id);

  revalidatePath('/ajustes', 'layout');
  revalidatePath('/agenda');
  revalidatePath('/hoy');
  return { ok: !error, error: error?.message ?? null };
}
