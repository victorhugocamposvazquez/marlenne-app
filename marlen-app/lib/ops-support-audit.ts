import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyOpsSession } from '@/lib/ops-support-token';

export const OPS_SESSION_COOKIE = 'marlenne_ops_ctx';
export const OPS_PENDING_COOKIE = 'marlenne_ops_pending';

export function readOpsSession() {
  return verifyOpsSession(cookies().get(OPS_SESSION_COOKIE)?.value);
}

/** Registra una acción hecha mientras la sesión Ops está activa (fire-and-forget). */
export async function recordOpsAudit(
  action: string,
  detail: Record<string, unknown> = {},
): Promise<void> {
  const ctx = readOpsSession();
  if (!ctx) return;
  try {
    const admin = createAdminClient();
    let staffName: string | null = null;
    const { data: staff } = await admin
      .from('staff')
      .select('full_name')
      .eq('id', ctx.staffUserId)
      .maybeSingle();
    staffName = (staff?.full_name as string | null) ?? null;

    await admin.from('ops_support_audit').insert({
      salon_id: ctx.salonId,
      ops_email: ctx.opsEmail,
      company_label: ctx.companyName,
      staff_user_id: ctx.staffUserId,
      staff_name: staffName,
      action,
      detail,
    });
  } catch {
    /* no bloquear la acción del usuario */
  }
}
