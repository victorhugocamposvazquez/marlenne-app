'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Placeholder del selector de perfil del prototipo.
 * En producción: magic link o email + contraseña por miembro del equipo,
 * y esta pantalla desaparece (un usuario = un perfil).
 */
export async function signInAs(formData: FormData) {
  const profile = String(formData.get('profile'));
  const sb = createClient();
  const password = process.env.DEMO_PASSWORD;

  let email = process.env[`DEMO_EMAIL_${profile.toUpperCase()}`];
  // Las profesionales entran con su UUID de staff (= auth.users.id).
  if (!email && /^[0-9a-f-]{36}$/i.test(profile)) {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const { data } = await createAdminClient().auth.admin.getUserById(profile);
    email = data.user?.email ?? undefined;
  }

  if (!email || !password) throw new Error('Configura las credenciales del equipo en Supabase Auth');

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;

  redirect(profile === 'admin' || profile === 'reception' ? '/hoy' : '/agenda');
}

export async function signOut() {
  const sb = createClient();
  await sb.auth.signOut();
  redirect('/login');
}
