import { panelAdmin } from '@/lib/supabase-admin';

/** Cuenta de recepción/admin con la que Ops entra (solo lectura de agenda compartida). */
export async function pickSupportStaffUserId(salonId: string): Promise<{
  id: string;
  full_name: string;
} | null> {
  const sb = panelAdmin();
  if (!sb) return null;
  const { data } = await sb
    .from('staff')
    .select('id, full_name, role')
    .eq('salon_id', salonId)
    .eq('is_active', true)
    .in('role', ['admin', 'reception']);
  const rank = (role: string) => (role === 'admin' ? 0 : role === 'reception' ? 1 : 2);
  const row = [...(data ?? [])].sort((a, b) => rank(String(a.role)) - rank(String(b.role)))[0];
  if (!row) return null;
  return { id: row.id as string, full_name: row.full_name as string };
}

export async function resolveSupportStaff(
  salonId: string,
  staffUserId: string,
): Promise<{ id: string; full_name: string } | null> {
  const sb = panelAdmin();
  if (!sb) return null;
  const { data } = await sb
    .from('staff')
    .select('id, full_name')
    .eq('salon_id', salonId)
    .eq('id', staffUserId)
    .eq('is_active', true)
    .in('role', ['admin', 'reception', 'provider'])
    .maybeSingle();
  if (!data) return null;
  return { id: data.id as string, full_name: data.full_name as string };
}
