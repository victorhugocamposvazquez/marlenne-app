'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/queries';
import { sendReminderForAppointment } from '@/lib/sms/reminders';
import { normalizeSmsSender } from '@/lib/sms/sender';
import { createClient } from '@/lib/supabase/server';

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireSalonAdmin() {
  const me = await getSession();
  if (!me || me.role !== 'admin') return null;
  return me;
}

function bump() {
  revalidatePath('/ajustes/sms');
  revalidatePath('/ajustes', 'layout');
}

export async function saveSmsConfig(input: {
  enabled: boolean;
  reminder_mode: 'hours_before' | 'day_before_at_hour';
  reminder_hours_before: number;
  reminder_send_hour: number;
  test_mode: boolean;
  sender: string;
}): Promise<ActionResult> {
  const me = await requireSalonAdmin();
  if (!me) return { ok: false, error: 'Solo dirección' };

  const sender = normalizeSmsSender(input.sender);
  if (!sender.ok) return sender;

  const hours = Math.min(168, Math.max(1, Math.round(input.reminder_hours_before)));
  const sendHour = Math.min(23, Math.max(0, Math.round(input.reminder_send_hour)));

  const sb = createClient();
  const { error } = await sb.from('sms_config').update({
    enabled: input.enabled,
    reminder_mode: input.reminder_mode,
    reminder_hours_before: hours,
    reminder_send_hour: sendHour,
    test_mode: input.test_mode,
    sender: sender.sender,
    updated_at: new Date().toISOString(),
  }).eq('salon_id', me.salon_id);

  bump();
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function saveSmsTemplate(cuerpo: string): Promise<ActionResult> {
  const me = await requireSalonAdmin();
  if (!me) return { ok: false, error: 'Solo dirección' };

  const body = cuerpo.trim();
  if (body.length < 10) return { ok: false, error: 'La plantilla es demasiado corta' };

  const sb = createClient();
  const { error } = await sb.from('sms_templates').update({
    cuerpo: body,
    updated_at: new Date().toISOString(),
  }).eq('salon_id', me.salon_id).eq('clave', 'recordatorio_cita');

  bump();
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function sendTestReminder(appointmentId: string): Promise<ActionResult> {
  const me = await requireSalonAdmin();
  if (!me) return { ok: false, error: 'Solo dirección' };

  const sb = createClient();
  const { data: appt } = await sb.from('appointments')
    .select('id')
    .eq('id', appointmentId)
    .eq('salon_id', me.salon_id)
    .maybeSingle();
  if (!appt) return { ok: false, error: 'Cita no encontrada' };

  const r = await sendReminderForAppointment(appointmentId, { forzarReal: true });
  bump();
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}
