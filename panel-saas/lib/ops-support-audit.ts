import { panelAdmin } from '@/lib/supabase-admin';

export type OpsAuditRow = {
  id: string;
  when: string;
  opsEmail: string;
  action: string;
  staffName: string | null;
  detail: Record<string, unknown>;
};

export async function loadOpsSupportAudit(salonId: string, limit = 25): Promise<OpsAuditRow[]> {
  const sb = panelAdmin();
  if (!sb) return [];
  const { data, error } = await sb
    .from('ops_support_audit')
    .select('id, created_at, ops_email, action, staff_name, detail')
    .eq('salon_id', salonId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map(row => ({
    id: row.id as string,
    when: row.created_at as string,
    opsEmail: row.ops_email as string,
    action: row.action as string,
    staffName: (row.staff_name as string | null) ?? null,
    detail: (row.detail as Record<string, unknown>) ?? {},
  }));
}
