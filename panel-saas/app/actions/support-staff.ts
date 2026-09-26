'use server';

import { LIVE_COMPANY_ID, getCompany } from '@/lib/mock/companies';
import { loadLiveCenter } from '@/lib/live-center';
import { liveStaffRoleLabel } from '@/lib/live-staff';
import { panelAdmin } from '@/lib/supabase-admin';

export type SupportStaffOption = {
  id: string;
  name: string;
  roleLabel: string;
  email: string | null;
};

export async function listSupportStaffOptions(
  companyId: number,
): Promise<{ ok: true; staff: SupportStaffOption[] } | { ok: false; error: string }> {
  const company = getCompany(companyId);
  if (!company?.live || companyId !== LIVE_COMPANY_ID) {
    return { ok: false, error: 'Solo empresas Live.' };
  }
  const live = await loadLiveCenter();
  if (!live?.salonId) return { ok: false, error: 'Centro no encontrado.' };

  const sb = panelAdmin();
  if (!sb) return { ok: false, error: 'Sin acceso a Supabase.' };

  const { data, error } = await sb
    .from('staff')
    .select('id, full_name, role, job_title, is_active')
    .eq('salon_id', live.salonId)
    .eq('is_active', true)
    .in('role', ['admin', 'reception', 'provider'])
    .order('sort_order');

  if (error) return { ok: false, error: 'No se ha podido leer el equipo.' };

  const rank = (role: string) => (role === 'reception' ? 0 : role === 'admin' ? 1 : 2);
  const staff = [...(data ?? [])]
    .sort((a, b) => rank(String(a.role)) - rank(String(b.role)))
    .map(row => ({
      id: row.id as string,
      name: row.full_name as string,
      roleLabel: liveStaffRoleLabel(row.role as string, row.job_title as string | null),
      email: null as string | null,
    }));

  const ids = staff.map(s => s.id);
  if (ids.length) {
    const { data: users } = await sb.auth.admin.listUsers({ perPage: 200 });
    const byId = new Map((users?.users ?? []).map(u => [u.id, u.email ?? null]));
    for (const s of staff) s.email = byId.get(s.id) ?? null;
  }

  return { ok: true, staff };
}
