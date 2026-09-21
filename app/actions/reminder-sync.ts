'use server';

import { syncAppointmentReminder, syncClientFutureReminders } from '@/lib/sms/reminder-sync';

/** Recalcula el vencimiento del recordatorio tras crear o mover una cita. */
export async function syncAppointmentReminderAction(appointmentId: string) {
  if (!appointmentId) return;
  try {
    await syncAppointmentReminder(appointmentId);
  } catch (e) {
    console.error('[sms] syncAppointmentReminderAction', appointmentId, e);
  }
}

/** Tras cambiar teléfono u opt-in de una clienta. */
export async function syncClientRemindersAction(clientId: string, prevPhone?: string | null) {
  if (!clientId) return;
  try {
    await syncClientFutureReminders(clientId, prevPhone);
  } catch (e) {
    console.error('[sms] syncClientRemindersAction', clientId, e);
  }
}
