import { createAdminClient } from '@/lib/supabase/admin';
import {
  avisoQuedoObsoleto,
  computeReminderDueAt,
  debeReabrirAviso,
  loadSmsConfig,
  RESET_AVISO,
  type PreviaReminder,
} from '@/lib/sms/reminders';

const SYNC_SELECT = `
  id, salon_id, client_id, starts_at, status,
  reminder_due_at, reminder_sent_at, reminder_skipped_reason, reminder_skipped_phone,
  client:clients(phone)
`;

type SyncRow = {
  id: string;
  salon_id: string;
  client_id: string | null;
  starts_at: string;
  status: string;
  reminder_due_at: string | null;
  reminder_sent_at: string | null;
  reminder_skipped_reason: string | null;
  reminder_skipped_phone: string | null;
  client: { phone: string | null } | null;
};

/**
 * Recalcula reminder_due_at y reabre el aviso si cambió teléfono, hora o vencimiento.
 * Pasa `previa` con el estado anterior al UPDATE para detectar cambios relevantes.
 */
export async function syncAppointmentReminder(
  appointmentId: string,
  previa?: PreviaReminder | null,
): Promise<void> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('appointments')
    .select(SYNC_SELECT)
    .eq('id', appointmentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return;

  const appt = data as unknown as SyncRow;
  const config = await loadSmsConfig(appt.salon_id);
  const telefono = appt.client?.phone ?? null;
  const nowIso = new Date().toISOString();

  if (appt.status !== 'prog') {
    await supabase
      .from('appointments')
      .update({
        reminder_due_at: null,
        updated_at: nowIso,
      })
      .eq('id', appt.id);
    return;
  }

  const startsAt = new Date(appt.starts_at);
  const reminderDueAt = computeReminderDueAt(startsAt, config);

  const dueChanged = appt.reminder_due_at
    ? Math.abs(new Date(appt.reminder_due_at).getTime() - reminderDueAt.getTime()) >= 5 * 60 * 1000
    : false;
  const reabrir = previa
    ? debeReabrirAviso(previa, telefono, startsAt, reminderDueAt)
    : Boolean(
      appt.reminder_sent_at
      && (dueChanged || avisoQuedoObsoleto(appt.reminder_sent_at, reminderDueAt)),
    );

  await supabase
    .from('appointments')
    .update({
      ...(reabrir ? RESET_AVISO : {}),
      reminder_due_at: reminderDueAt.toISOString(),
      updated_at: nowIso,
    })
    .eq('id', appt.id);
}

/** Cuando cambia el teléfono de una clienta, recalcula sus citas futuras programadas. */
export async function syncClientFutureReminders(
  clientId: string,
  prevPhone?: string | null,
): Promise<number> {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id, phone')
    .eq('id', clientId)
    .maybeSingle();
  if (clientErr) throw new Error(clientErr.message);
  if (!client) return 0;

  const { data: appts, error: apptErr } = await supabase
    .from('appointments')
    .select(SYNC_SELECT)
    .eq('client_id', clientId)
    .eq('status', 'prog')
    .gt('starts_at', nowIso);

  if (apptErr) throw new Error(apptErr.message);
  if (!appts?.length) return 0;

  let updated = 0;
  for (const row of appts as unknown as SyncRow[]) {
    const config = await loadSmsConfig(row.salon_id);
    const startsAt = new Date(row.starts_at);
    const reminderDueAt = computeReminderDueAt(startsAt, config);
    const previa: PreviaReminder = {
      client_phone: prevPhone ?? row.reminder_skipped_phone ?? row.client?.phone ?? null,
      reminder_sent_at: row.reminder_sent_at,
      starts_at: row.starts_at,
    };
    const telefono = client.phone;
    const reabrir = debeReabrirAviso(previa, telefono, startsAt, reminderDueAt);

    const { error } = await supabase
      .from('appointments')
      .update({
        ...(reabrir ? RESET_AVISO : {}),
        reminder_due_at: reminderDueAt.toISOString(),
        updated_at: nowIso,
      })
      .eq('id', row.id);

    if (!error) updated += 1;
    else console.error('[sms] syncClientFutureReminders', row.id, error.message);
  }

  return updated;
}
