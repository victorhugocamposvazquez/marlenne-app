'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { normalizeEmail, validateSignIn } from '@/lib/auth-form';
import { isPlatformAdmin, requirePlatformAdmin } from '@/lib/require-platform-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

function appOrigin() {
  return headers().get('origin')
    ?? process.env.APP_URL?.replace(/\/$/, '')
    ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000');
}

export async function signInForPlatform(formData: FormData) {
  const email = normalizeEmail(String(formData.get('email') ?? ''));
  const password = String(formData.get('password') ?? '');
  const invalid = validateSignIn({ email, password });
  if (invalid) return { ok: false as const, error: invalid };

  const sb = createClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false as const, error: 'Email o contraseña incorrectos' };

  const { data: { user } } = await sb.auth.getUser();
  if (!user || !(await isPlatformAdmin(user.id))) {
    await sb.auth.signOut();
    return { ok: false as const, error: 'No tienes acceso a la consola Marlén' };
  }

  redirect('/platform/centros');
}

export async function forceSmsCronForSalon(salonId: string) {
  await requirePlatformAdmin();

  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false as const, error: 'CRON_SECRET no configurado' };

  const url = `${appOrigin()}/api/cron/sms?salon_id=${encodeURIComponent(salonId)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
    });
  } catch {
    return { ok: false as const, error: 'No se ha podido llamar al cron SMS' };
  }

  let summary: Record<string, unknown> = {};
  try {
    summary = await res.json();
  } catch {
    summary = { status: res.status };
  }

  const admin = createAdminClient();
  await admin.from('platform_cron_runs').insert({
    job: 'sms',
    ok: res.ok,
    summary: { ...summary, salon_id: salonId, forced: true },
  });

  revalidatePath('/platform/centros');
  revalidatePath(`/platform/centros/${salonId}`);

  if (!res.ok) {
    return { ok: false as const, error: 'El cron SMS ha fallado' };
  }
  return { ok: true as const, summary };
}
