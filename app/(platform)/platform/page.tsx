export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { isPlatformAdmin } from '@/lib/require-platform-admin';
import { createClient } from '@/lib/supabase/server';

export default async function PlatformIndexPage() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (user && (await isPlatformAdmin(user.id))) redirect('/platform/centros');
  redirect('/platform/login');
}
