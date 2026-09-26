'use server';

import { getPanelUser } from '@/lib/panel-session';
import { getCompany, LIVE_COMPANY_ID } from '@/lib/mock/companies';
import { loadLiveCenter } from '@/lib/live-center';
import { marlenAppUrl } from '@/lib/marlen-app-url';
import { pickSupportStaffUserId } from '@/lib/ops-support-staff';
import { signOpsEnterToken } from '@/lib/ops-support-token';
import { panelAdmin } from '@/lib/supabase-admin';

function safePath(path: string) {
  if (!path.startsWith('/') || path.startsWith('//')) return '/agenda';
  return path.split('?')[0] ?? '/agenda';
}

export async function createSupportEntryUrl(
  companyId: number,
  path: string,
): Promise<{ ok: true; url: string; staffName: string } | { ok: false; error: string }> {
  const ops = getPanelUser();
  if (!ops?.email) {
    return { ok: false, error: 'Entra en el panel con tu correo de Ops.' };
  }

  const company = getCompany(companyId);
  if (!company?.live) {
    return { ok: false, error: 'Solo empresas Live tienen app real embebida.' };
  }

  const live = await loadLiveCenter();
  if (!live?.salonId) {
    return { ok: false, error: 'No se ha podido localizar el centro en la base.' };
  }

  if (companyId !== LIVE_COMPANY_ID) {
    return { ok: false, error: 'Este centro Live aún no está cableado.' };
  }

  const staff = await pickSupportStaffUserId(live.salonId);
  if (!staff) {
    return { ok: false, error: 'No hay recepción o admin activa en ese centro.' };
  }

  const sb = panelAdmin();
  if (!sb) {
    return { ok: false, error: 'El panel no tiene acceso a Supabase (service role).' };
  }

  const next = safePath(path);
  const { token, payload } = signOpsEnterToken({
    salonId: live.salonId,
    staffUserId: staff.id,
    opsEmail: ops.email,
    companyName: company.name,
    next,
  });

  const expiresAt = new Date(payload.e).toISOString();
  const { error: tokErr } = await sb.from('ops_support_token').insert({
    jti: payload.jti,
    salon_id: live.salonId,
    ops_email: ops.email,
    expires_at: expiresAt,
  });
  if (tokErr) {
    return { ok: false, error: 'No se ha podido preparar la entrada (¿migración ops_support?).' };
  }

  await sb.from('ops_support_audit').insert({
    salon_id: live.salonId,
    ops_email: ops.email,
    company_label: company.name,
    staff_user_id: staff.id,
    staff_name: staff.full_name,
    action: 'link_created',
    detail: { next, jti: payload.jti },
  });

  const url = `${marlenAppUrl()}/ops/enter?t=${encodeURIComponent(token)}`;
  return { ok: true, url, staffName: staff.full_name };
}
