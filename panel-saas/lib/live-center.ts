import { panelAdmin } from '@/lib/supabase-admin';

export type LiveSend = {
  id: string;
  status: string;
  when: string;
  phone: string;
  body: string;
  error: string | null;
  origin: string;
};

export type LiveCenter = {
  salonId: string;
  name: string;
  sender: string | null;
  opsOn: boolean;
  centerOn: boolean;
  sent: number;
  failed: number;
  sends: LiveSend[];
};

import type { LiveStaff } from '@/lib/live-staff';

export type { LiveStaff };

const LIVE_DISPLAY_NAME = 'Arlett Beauty';

function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 4) return '···';
  return `··· ${digits.slice(-4)}`;
}

export async function loadLiveCenter(): Promise<LiveCenter | null> {
  const sb = panelAdmin();
  if (!sb) return null;

  const { data: configs, error } = await sb
    .from('sms_config')
    .select('salon_id, enabled, test_mode, sender')
    .eq('sender', 'ARLETBEAUTY')
    .limit(1);
  if (error || !configs?.length) return null;

  const cfg = configs[0];
  const salonId = cfg.salon_id as string;

  const { data: logs } = await sb
    .from('sms_log')
    .select('id, status, to_phone, body, created_at, error_message, origin')
    .eq('salon_id', salonId)
    .order('created_at', { ascending: false })
    .limit(30);

  const rows = logs ?? [];
  const sent = rows.filter(r => r.status === 'sent').length;
  const failed = rows.filter(r => r.status === 'failed').length;

  return {
    salonId,
    name: LIVE_DISPLAY_NAME,
    sender: (cfg.sender as string | null) ?? null,
    opsOn: cfg.test_mode === false,
    centerOn: cfg.enabled === true,
    sent,
    failed,
    sends: rows.map(r => ({
      id: r.id as string,
      status: r.status as string,
      when: r.created_at as string,
      phone: maskPhone(String(r.to_phone ?? '')),
      body: String(r.body ?? ''),
      error: (r.error_message as string | null) ?? null,
      origin: (r.origin as string) ?? '',
    })),
  };
}

export async function setOpsAutoSend(on: boolean): Promise<{ ok: boolean; error?: string }> {
  const sb = panelAdmin();
  if (!sb) return { ok: false, error: 'El panel no tiene acceso a la base' };
  const live = await loadLiveCenter();
  if (!live) return { ok: false, error: 'No está el centro en producción' };

  const { error } = await sb
    .from('sms_config')
    .update({ test_mode: !on, updated_at: new Date().toISOString() })
    .eq('salon_id', live.salonId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function loadLiveSalonId(): Promise<string | null> {
  const live = await loadLiveCenter();
  return live?.salonId ?? null;
}

/** Usuarios reales del centro en producción (staff + correo de acceso). */
export async function loadLiveStaff(salonId: string): Promise<LiveStaff[]> {
  const sb = panelAdmin();
  if (!sb) return [];

  const { data: rows, error } = await sb
    .from('staff')
    .select('id, full_name, role, job_title, is_active')
    .eq('salon_id', salonId)
    .order('sort_order');
  if (error || !rows?.length) return [];

  const { data: auth } = await sb.auth.admin.listUsers({ perPage: 200 });
  const emailById = new Map((auth?.users ?? []).map(u => [u.id, u.email ?? null]));

  return rows.map(r => ({
    id: r.id as string,
    name: r.full_name as string,
    role: r.role as string,
    jobTitle: (r.job_title as string | null) ?? null,
    email: emailById.get(r.id as string) ?? null,
    active: r.is_active === true,
  }));
}

