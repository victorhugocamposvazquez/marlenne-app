'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { avatarColor } from '@/lib/categories';
import { normalizeEmail, validateEmail, validateSignIn, validateSignUp, signupRole } from '@/lib/auth-form';
import { getSession } from '@/lib/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

function appOrigin() {
  return headers().get('origin')
    ?? process.env.APP_URL?.replace(/\/$/, '')
    ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000');
}

function displayName(user: { email?: string | null; user_metadata?: Record<string, unknown> }, fallback: string) {
  const meta = user.user_metadata?.full_name;
  if (typeof meta === 'string' && meta.trim().length >= 2) return meta.trim();
  const email = user.email ?? fallback;
  return email.split('@')[0] || fallback;
}

/** Enlaza el usuario de Auth al centro. No usa user_metadata para el rol. */
export async function ensureStaff(userId: string, fullName: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient();
    const { data: existing } = await admin.from('staff').select('id').eq('id', userId).maybeSingle();
    if (existing) return { ok: true };

    const { data: salon } = await admin.from('salons').select('id').limit(1).maybeSingle();
    if (!salon) return { ok: false, error: 'No hay centro configurado' };

    const { count } = await admin
      .from('staff')
      .select('id', { count: 'exact', head: true })
      .eq('salon_id', salon.id);

    const { data: last } = await admin
      .from('staff')
      .select('sort_order')
      .eq('salon_id', salon.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await admin.from('staff').insert({
      id: userId,
      salon_id: salon.id,
      full_name: fullName.trim(),
      role: signupRole(count ?? 0),
      color: avatarColor(fullName),
      sort_order: (last?.sort_order ?? 0) + 1,
      is_active: true,
    });
    if (error && error.code !== '23505') return { ok: false, error: 'No se ha podido entrar en el equipo.' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'No se ha podido entrar en el equipo.' };
  }
}

export async function signIn(formData: FormData) {
  const email = normalizeEmail(String(formData.get('email') ?? ''));
  const password = String(formData.get('password') ?? '');
  const invalid = validateSignIn({ email, password });
  if (invalid) return { ok: false, error: invalid };

  const sb = createClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: 'Email o contraseña incorrectos' };

  const me = await getSession();
  if (!me) {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return { ok: false, error: 'Email o contraseña incorrectos' };
    const attached = await ensureStaff(user.id, displayName(user, email));
    if (!attached.ok) {
      await sb.auth.signOut();
      return { ok: false, error: attached.error };
    }
  }

  redirect('/hoy');
}

export async function signUp(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const email = normalizeEmail(String(formData.get('email') ?? ''));
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  const invalid = validateSignUp({ name, email, password, confirm });
  if (invalid) return { ok: false, error: invalid, confirm: false };

  const sb = createClient();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${appOrigin()}/login`,
    },
  });
  if (error) {
    const dup = /already|registered|exists/i.test(error.message);
    return {
      ok: false,
      error: dup ? 'Ya hay una cuenta con ese email. Entra o recupera la contraseña.' : 'No se ha podido crear la cuenta.',
      confirm: false,
    };
  }
  if (data.user && (data.user.identities?.length ?? 1) === 0) {
    return { ok: true, error: null, confirm: true };
  }
  if (data.user) {
    const attached = await ensureStaff(data.user.id, name);
    if (!attached.ok) return { ok: false, error: attached.error, confirm: false };
  }
  if (!data.session) return { ok: true, error: null, confirm: true };
  redirect('/hoy');
}

export async function requestPasswordReset(formData: FormData) {
  const email = normalizeEmail(String(formData.get('email') ?? ''));
  const invalid = validateEmail(email);
  if (invalid) return { ok: false, error: invalid };
  const sb = createClient();
  await sb.auth.resetPasswordForEmail(email, { redirectTo: `${appOrigin()}/recuperar` });
  return { ok: true, error: null };
}

export async function changePassword(formData: FormData) {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (password.length < 8) return { ok: false, error: 'Mínimo 8 caracteres' };
  if (password !== confirm) return { ok: false, error: 'Las contraseñas no coinciden' };

  const sb = createClient();
  const { error } = await sb.auth.updateUser({ password });
  return { ok: !error, error: error?.message ?? null };
}

export async function signOut() {
  const sb = createClient();
  await sb.auth.signOut();
  redirect('/login');
}
