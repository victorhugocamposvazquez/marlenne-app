'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { freeSlots } from '@/lib/queries';
import { minutesOfDay, toTimestamp } from '@/lib/time';

/** Mover una cita (drag & drop): nueva hora y/o nueva profesional. */
export async function moveAppointment({
  id, date, startMin, providerId,
}: { id: string; date: string; startMin: number; providerId: string }) {
  const sb = createClient();
  const { error } = await sb
    .from('appointments')
    .update({ starts_at: toTimestamp(date, startMin), provider_id: providerId })
    .eq('id', id);

  revalidatePath('/agenda');
  revalidatePath('/hoy');
  // El índice de exclusión y el trigger de bloqueos rechazan solapes:
  // devolvemos el error para que el cliente revierta el movimiento optimista.
  return { ok: !error, error: error?.message ?? null };
}

/**
 * Huecos que caben en la jornada de la profesional, ya sin solapes ni bloqueos.
 * Los sheets la llaman al cambiar servicio, profesional o día.
 */
export async function slotsFor(
  providerId: string, date: string, durationMin: number, excludeId?: string,
) {
  const slots = await freeSlots(providerId, date, durationMin, excludeId);
  return slots.map(minutesOfDay);
}

/** Reprogramar desde el modal: día, profesional y hora. */
export async function rescheduleAppointment({
  id, date, startMin, providerId,
}: { id: string; date: string; startMin: number; providerId: string }) {
  return moveAppointment({ id, date, startMin, providerId });
}

/**
 * Cambiar estado. Con 'done', el trigger appointments_done_opens_treatment
 * abre el tratamiento o avanza la sesión automáticamente.
 */
export async function setStatus(formData: FormData) {
  const sb = createClient();
  const id = String(formData.get('id'));
  const status = String(formData.get('status'));
  await sb.from('appointments').update({ status }).eq('id', id);
  revalidatePath('/agenda');
  revalidatePath('/hoy');
}

/** La misma cosa desde los sheets, que necesitan saber si ha fallado. */
export async function updateStatus(id: string, status: string) {
  const sb = createClient();
  const { error } = await sb.from('appointments').update({ status }).eq('id', id);
  revalidatePath('/agenda');
  revalidatePath('/hoy');
  return { ok: !error, error: error?.message ?? null };
}

export async function createAppointment(input: {
  clientId?: string; clientName?: string; serviceId: string; providerId: string;
  date: string; startMin: number; durationMin: number; priceCents: number;
}) {
  const sb = createClient();
  const me = await sb.auth.getUser();
  const { data: staff } = await sb.from('staff').select('salon_id').eq('id', me.data.user!.id).single();

  const { error } = await sb.from('appointments').insert({
    salon_id: staff!.salon_id,
    client_id: input.clientId ?? null,
    client_name: input.clientName ?? null,
    service_id: input.serviceId,
    provider_id: input.providerId,
    starts_at: toTimestamp(input.date, input.startMin),
    duration_min: input.durationMin,
    price_cents: input.priceCents,
    created_by: me.data.user!.id,
  });

  revalidatePath('/agenda');
  revalidatePath('/hoy');
  revalidatePath('/clientas');
  return { ok: !error, error: error?.message ?? null };
}

export async function cancelAppointment(id: string) {
  const sb = createClient();
  const { error } = await sb.from('appointments').delete().eq('id', id);
  revalidatePath('/agenda');
  revalidatePath('/hoy');
  return { ok: !error, error: error?.message ?? null };
}

/** Marca la cita como hecha y, si el trigger abre tratamiento, guarda la sesión. */
export async function closeSession(input: {
  appointmentId: string;
  params?: Record<string, string>;
  note?: string;
  measurements?: { metric: string; value?: number; text?: string; unit?: string }[];
}) {
  const sb = createClient();
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

  revalidatePath('/agenda');
  revalidatePath('/hoy');
  revalidatePath('/clientas');
  return { ok: true, error: null };
}
