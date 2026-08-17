'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { toTimestamp } from '@/lib/time';

/** Mover una cita (drag & drop): nueva hora y/o nueva profesional. */
export async function moveAppointment({
  id, date, startMin, providerId,
}: { id: string; date: string; startMin: number; providerId: string }) {
  const sb = createClient();
  const { error } = await sb
    .from('appointments')
    .update({ starts_at: toTimestamp(new Date(date), startMin), provider_id: providerId })
    .eq('id', id);

  revalidatePath('/agenda');
  // El índice de exclusión y el trigger de bloqueos rechazan solapes:
  // devolvemos el error para que el cliente revierta el movimiento optimista.
  return { ok: !error, error: error?.message ?? null };
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
    starts_at: toTimestamp(new Date(input.date), input.startMin),
    duration_min: input.durationMin,
    price_cents: input.priceCents,
    created_by: me.data.user!.id,
  });

  revalidatePath('/agenda');
  return { ok: !error, error: error?.message ?? null };
}

export async function cancelAppointment(id: string) {
  const sb = createClient();
  await sb.from('appointments').delete().eq('id', id);
  revalidatePath('/agenda');
}

/** Cierre de sesión (todo opcional): parámetros, nota, medidas y fotos. */
export async function saveSessionClose(input: {
  appointmentId: string;
  treatmentId: string;
  sessionNo: number;
  params?: Record<string, string>;
  note?: string;
  measurements?: { metric: string; value?: number; text?: string; unit?: string }[];
}) {
  const sb = createClient();

  const patch: Record<string, unknown> = {};
  if (input.params && Object.keys(input.params).length) patch.last_params = input.params;
  if (input.note) patch.note = input.note;
  if (Object.keys(patch).length) {
    await sb.from('treatments').update(patch).eq('id', input.treatmentId);
  }

  if (input.measurements?.length) {
    await sb.from('measurements').insert(
      input.measurements.map(m => ({
        treatment_id: input.treatmentId,
        appointment_id: input.appointmentId,
        session_no: input.sessionNo,
        metric: m.metric,
        value_num: m.value ?? null,
        value_text: m.text ?? null,
        unit: m.unit ?? null,
      })),
    );
  }

  revalidatePath('/clientas');
  return { ok: true };
}
