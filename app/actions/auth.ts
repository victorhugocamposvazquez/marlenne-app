'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function homeFor(role: string | null) {
  return role === 'admin' || role === 'reception' ? '/hoy' : '/agenda';
}

export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { ok: false, error: 'Pon el email y la contraseña' };

  const sb = createClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: 'Email o contraseña incorrectos' };

  const { data: { user } } = await sb.auth.getUser();
  const { data: staff } = user
    ? await sb.from('staff').select('role').eq('id', user.id).maybeSingle()
    : { data: null };

  redirect(homeFor(staff?.role ?? null));
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { ok: false, error: 'Pon el email' };
  const sb = createClient();
  const origin = headers().get('origin')
    ?? process.env.APP_URL?.replace(/\/$/, '')
    ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000');
  await sb.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/recuperar` });
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
