import { redirect } from 'next/navigation';
import { getSession } from '@/lib/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export type PlatformAdminContext = {
  userId: string;
  staff: Awaited<ReturnType<typeof getSession>>;
};

/** Comprueba platform_admins con el cliente admin (fuera de RLS de staff). */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('platform_admins')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}

/** Sesión de consola Marlén. Usa getSession (staff opcional) + admin client para el rol. */
export async function requirePlatformAdmin(): Promise<PlatformAdminContext> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/platform/login');

  if (!(await isPlatformAdmin(user.id))) redirect('/platform/login');

  const staff = await getSession();
  return { userId: user.id, staff };
}
