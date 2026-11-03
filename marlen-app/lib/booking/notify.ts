import { sendMail } from '@/lib/mail';
import { syncAppointmentReminder } from '@/lib/sms/reminder-sync';
import type { BookingConfirm } from '@/lib/booking/types';

export type BookingCreatedPayload = BookingConfirm & {
  salon_id?: string;
  client_email?: string | null;
  client_phone?: string | null;
  timezone?: string | null;
  notify_email?: string | null;
  sms_reminders?: boolean | null;
};

function formatWhen(iso: string, timezone: string | null | undefined) {
  try {
    const tz = timezone || 'Europe/Madrid';
    return new Intl.DateTimeFormat('es-ES', {
      timeZone: tz,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Tras alta online: SMS reminder + emails (best-effort, no falla la reserva). */
export async function afterPublicBookingCreated(payload: BookingCreatedPayload): Promise<void> {
  if (!payload.ok || !payload.id) return;

  if (payload.sms_reminders !== false) {
    try {
      await syncAppointmentReminder(payload.id);
    } catch (e) {
      console.error('[booking] syncAppointmentReminder', payload.id, e);
    }
  }

  const when = formatWhen(payload.starts_at, payload.timezone);
  const clientEmail = payload.client_email?.trim() || null;
  const salonEmail = payload.notify_email?.trim() || null;

  if (clientEmail) {
    const subject = `Reserva confirmada · ${payload.salon_name}`;
    const text = [
      `Hola ${payload.client_name},`,
      '',
      `Tu cita en ${payload.salon_name} está confirmada.`,
      `Servicio: ${payload.service_name}`,
      `Cuándo: ${when}`,
      '',
      'Si necesitas cambiarla o cancelarla, contacta con el centro.',
      '',
      '— Marlén',
    ].join('\n');
    const r = await sendMail({
      to: clientEmail,
      subject,
      text,
      kind: 'booking_client_confirm',
      salonId: payload.salon_id ?? null,
      tags: ['booking', 'client'],
    });
    if (!r.ok) console.error('[booking] email clienta', r.error);
  }

  if (salonEmail) {
    const subject = `Nueva reserva online · ${payload.service_name}`;
    const text = [
      `Nueva reserva en ${payload.salon_name}.`,
      `Clienta: ${payload.client_name}`,
      payload.client_phone ? `Móvil: ${payload.client_phone}` : null,
      clientEmail ? `Email: ${clientEmail}` : null,
      `Servicio: ${payload.service_name}`,
      `Cuándo: ${when}`,
      '',
      '— Marlén',
    ]
      .filter(Boolean)
      .join('\n');
    const r = await sendMail({
      to: salonEmail,
      subject,
      text,
      kind: 'booking_salon_notify',
      salonId: payload.salon_id ?? null,
      tags: ['booking', 'salon'],
    });
    if (!r.ok) console.error('[booking] email centro', r.error);
  }
}
