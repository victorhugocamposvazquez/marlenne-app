'use server';

import { requireRole } from '@/lib/require-session';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { afterPublicBookingCreated } from '@/lib/booking/notify';

/** Reenvía emails de confirmación de una cita online (admin / ops con sesión). */
export async function resendOnlineBookingEmails(
  appointmentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireRole('admin', 'reception');
  const sb = createClient();
  const { data, error } = await sb
    .from('appointments')
    .select(`
      id, starts_at, duration_min, source, salon_id,
      service:services(name),
      client:clients(full_name, email, phone),
      salon:salons(name, timezone, booking_notify_email, booking_sms_reminders)
    `)
    .eq('id', appointmentId)
    .eq('salon_id', me.salon_id)
    .maybeSingle();

  if (error || !data) return { ok: false, error: error?.message ?? 'Cita no encontrada' };
  const raw = data as unknown as {
    id: string;
    starts_at: string;
    duration_min: number;
    source?: string;
    service: { name: string } | { name: string }[] | null;
    client: {
      full_name: string | null;
      email: string | null;
      phone: string | null;
    } | {
      full_name: string | null;
      email: string | null;
      phone: string | null;
    }[] | null;
    salon: {
      name: string;
      timezone: string | null;
      booking_notify_email: string | null;
      booking_sms_reminders: boolean | null;
    } | {
      name: string;
      timezone: string | null;
      booking_notify_email: string | null;
      booking_sms_reminders: boolean | null;
    }[] | null;
  };
  if (raw.source !== 'online') {
    return { ok: false, error: 'Solo citas reservadas online' };
  }

  const service = Array.isArray(raw.service) ? raw.service[0] : raw.service;
  const client = Array.isArray(raw.client) ? raw.client[0] : raw.client;
  const salon = Array.isArray(raw.salon) ? raw.salon[0] : raw.salon;

  await afterPublicBookingCreated({
    ok: true,
    id: raw.id,
    starts_at: raw.starts_at,
    duration_min: raw.duration_min,
    service_name: service?.name ?? 'Servicio',
    salon_name: salon?.name ?? 'Centro',
    client_name: client?.full_name ?? 'Clienta',
    client_email: client?.email,
    client_phone: client?.phone,
    timezone: salon?.timezone,
    notify_email: salon?.booking_notify_email,
    sms_reminders: false,
  });

  // Toque de auditoría ligera
  const admin = createAdminClient();
  await admin
    .from('appointments')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', appointmentId);

  return { ok: true };
}
