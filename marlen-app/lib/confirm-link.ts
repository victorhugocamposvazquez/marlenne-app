import type { SupabaseClient } from '@supabase/supabase-js';

export function linkCopy(code?: string) {
  if (code === 'expired') return 'Este enlace ha caducado. Llama al centro.';
  if (code === 'gone') return 'Esta cita ya no está disponible.';
  if (code === 'not_found') return 'No hemos encontrado esa cita.';
  return 'No se ha podido guardar. Prueba otra vez o llama al centro.';
}
export type LinkPeek = {
  ok: boolean;
  code?: string;
  responded?: boolean;
  response?: 'yes' | 'no' | string | null;
  first_name?: string;
  service?: string;
  starts_at?: string;
};

export async function nextFreeSlot(
  sb: SupabaseClient,
  input: { durationMin: number; providerId?: string | null; excludeId?: string; days?: number },
) {
  const { data } = await sb.rpc('next_free_slot', {
    p_duration: input.durationMin,
    p_provider: input.providerId ?? null,
    p_exclude: input.excludeId ?? null,
    p_days: input.days ?? 7,
  });
  const row = data as { ok?: boolean; provider_id?: string; starts_at?: string } | null;
  if (!row?.ok || !row.provider_id || !row.starts_at) return null;
  return { providerId: row.provider_id, startsAt: row.starts_at };
}

export async function issueAppointmentLink(sb: SupabaseClient, appointmentId: string) {
  const { data } = await sb.rpc('issue_appointment_link', { p_appointment_id: appointmentId });
  const row = data as { ok?: boolean; token?: string; code?: string } | null;
  if (!row?.ok || !row.token) return null;
  return row.token;
}

export async function peekAppointmentLink(sb: SupabaseClient, token: string): Promise<LinkPeek> {
  const { data, error } = await sb.rpc('peek_appointment_link', { p_token: token });
  if (error) return { ok: false, code: 'error' };
  return (data ?? { ok: false, code: 'not_found' }) as LinkPeek;
}

export async function respondAppointmentLink(
  sb: SupabaseClient, token: string, action: 'yes' | 'no',
): Promise<LinkPeek> {
  const { data, error } = await sb.rpc('respond_appointment_link', {
    p_token: token,
    p_action: action,
  });
  if (error) return { ok: false, code: 'error' };
  return (data ?? { ok: false, code: 'not_found' }) as LinkPeek;
}
