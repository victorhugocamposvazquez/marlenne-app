import type { SupabaseClient } from '@supabase/supabase-js';
import { dayKey, minutesOfDay, toTimestamp } from '@/lib/time';

export type WriteResult = { ok: boolean; error: string | null; id?: string };

const BUSY = 'Ese hueco ya está ocupado';
const FORBIDDEN = 'No se ha podido guardar';

function overlapMsg(msg: string) {
  return /overlap|exclusion|bloqueada/i.test(msg);
}

/** Huecos que caben en la jornada, ya sin solapes ni bloqueos. */
export async function slotsFor(
  sb: SupabaseClient,
  providerId: string, date: string, durationMin: number, excludeId?: string,
) {
  const { data } = await sb.rpc('free_slots', {
    p_provider: providerId,
    p_date: dayKey(date),
    p_duration: durationMin,
    p_exclude: excludeId ?? null,
    p_step: 15,
  });
  return ((data ?? []) as string[]).map(minutesOfDay);
}

export async function createAppointment(
  sb: SupabaseClient,
  input: {
    clientId?: string; clientName?: string; serviceId: string; providerId: string;
    date: string; startMin: number; note?: string;
  },
): Promise<WriteResult> {
  const { data, error } = await sb.rpc('create_appointment', {
    p_client_id: input.clientId ?? null,
    p_client_name: input.clientName ?? null,
    p_service_id: input.serviceId,
    p_provider_id: input.providerId,
    p_starts_at: toTimestamp(input.date, input.startMin),
    p_note: input.note ?? null,
  });
  if (error) {
    return { ok: false, error: overlapMsg(error.message) ? BUSY : (error.message || FORBIDDEN) };
  }
  const row = data as { ok?: boolean; code?: string; id?: string } | null;
  if (row?.ok && row.id) return { ok: true, error: null, id: row.id };
  if (row?.code === 'overlap' || row?.code === 'blocked') return { ok: false, error: BUSY };
  return { ok: false, error: FORBIDDEN };
}

export async function updateStatus(sb: SupabaseClient, id: string, status: string): Promise<WriteResult> {
  const { error } = await sb.from('appointments').update({ status }).eq('id', id);
  return { ok: !error, error: error?.message ?? null };
}

export async function cancelAppointment(sb: SupabaseClient, id: string): Promise<WriteResult> {
  const { error } = await sb.from('appointments').delete().eq('id', id);
  return { ok: !error, error: error?.message ?? null };
}

export async function updateAppointmentNote(sb: SupabaseClient, id: string, note: string): Promise<WriteResult> {
  const { error } = await sb.from('appointments').update({ note: note.trim() || null }).eq('id', id);
  return { ok: !error, error: error?.message ?? null };
}

export async function createBlock(
  sb: SupabaseClient,
  input: { providerId: string; date: string; startMin: number; durationMin: number; reason: string; label?: string },
): Promise<WriteResult> {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: 'Sin sesión' };
  const { data: staff } = await sb.from('staff').select('salon_id').eq('id', user.id).maybeSingle();
  if (!staff) return { ok: false, error: 'Sin sesión' };
  const { error } = await sb.from('time_blocks').insert({
    salon_id: staff.salon_id,
    provider_id: input.providerId,
    reason: input.reason,
    label: input.label?.trim() || null,
    starts_at: toTimestamp(input.date, input.startMin),
    duration_min: input.durationMin,
  });
  return { ok: !error, error: overlapMsg(error?.message ?? '') ? BUSY : (error?.message ?? null) };
}

export async function deleteBlock(sb: SupabaseClient, id: string): Promise<WriteResult> {
  const { error } = await sb.from('time_blocks').delete().eq('id', id);
  return { ok: !error, error: error?.message ?? null };
}

export async function addToWaitlist(
  sb: SupabaseClient,
  input: { clientId?: string; clientName?: string; serviceId?: string; preference?: string },
): Promise<WriteResult> {
  if (!input.clientId && !input.clientName?.trim()) {
    return { ok: false, error: 'Indica quién espera' };
  }
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: 'Sin sesión' };
  const { data: staff } = await sb.from('staff').select('salon_id').eq('id', user.id).maybeSingle();
  if (!staff) return { ok: false, error: 'Sin sesión' };
  const { error } = await sb.from('waitlist').insert({
    salon_id: staff.salon_id,
    client_id: input.clientId ?? null,
    client_name: input.clientId ? null : input.clientName!.trim(),
    service_id: input.serviceId || null,
    preference: input.preference?.trim() || null,
  });
  return { ok: !error, error: error?.message ?? null };
}

export async function resolveWaitlist(sb: SupabaseClient, id: string): Promise<WriteResult> {
  const { error } = await sb.from('waitlist').update({ resolved_at: new Date().toISOString() }).eq('id', id);
  return { ok: !error, error: error?.message ?? null };
}

/** Marca hecha y, si el trigger abrió tratamiento, guarda params/medidas. */
export async function closeSession(
  sb: SupabaseClient,
  input: {
    appointmentId: string;
    params?: Record<string, string>;
    note?: string;
    measurements?: { metric: string; value?: number; text?: string; unit?: string }[];
  },
): Promise<WriteResult> {
  const { error: statusErr } = await sb
    .from('appointments')
    .update({ status: 'done' })
    .eq('id', input.appointmentId);
  if (statusErr) return { ok: false, error: statusErr.message };

  const { data: appt } = await sb
    .from('appointments')
    .select('id, treatment_id, session_no')
    .eq('id', input.appointmentId)
    .maybeSingle();

  if (appt?.treatment_id) {
    const filled = Object.fromEntries(
      Object.entries(input.params ?? {}).filter(([, v]) => v.trim()),
    );
    const patch: Record<string, unknown> = {};
    if (Object.keys(filled).length) patch.last_params = filled;
    if (input.note?.trim()) patch.note = input.note.trim();
    if (Object.keys(patch).length) {
      const { error } = await sb.from('treatments').update(patch).eq('id', appt.treatment_id);
      if (error) return { ok: false, error: error.message };
    }

    const measures = (input.measurements ?? []).filter(m => m.value != null || m.text?.trim());
    if (measures.length) {
      const { error } = await sb.from('measurements').insert(
        measures.map(m => ({
          treatment_id: appt.treatment_id,
          appointment_id: input.appointmentId,
          session_no: appt.session_no,
          metric: m.metric,
          value_num: m.value ?? null,
          value_text: m.text?.trim() || null,
          unit: m.unit ?? null,
        })),
      );
      if (error) return { ok: false, error: error.message };
    }
  }

  return { ok: true, error: null };
}

export async function addTreatmentPhoto(
  sb: SupabaseClient,
  input: {
    treatmentId: string;
    kind: 'before' | 'after';
    zone?: string;
    sessionNo?: number;
    storagePath: string;
  },
): Promise<WriteResult> {
  const { error } = await sb.from('treatment_photos').insert({
    treatment_id: input.treatmentId,
    kind: input.kind,
    zone: input.zone?.trim() || null,
    session_no: input.sessionNo ?? null,
    storage_path: input.storagePath,
  });
  return { ok: !error, error: error?.message ?? null };
}
