'use server';

import { panelAdmin } from '@/lib/supabase-admin';
import { loadLiveCenter } from '@/lib/live-center';
import { slugifyBooking } from '@/lib/live-booking';

export type OpsBookingLink = {
  id: string;
  link_key: string;
  label: string | null;
  custom_title: string | null;
  payment_mode: 'free' | 'pay_full' | 'pay_deposit';
  deposit_bps: number;
  active: boolean;
};

async function liveSalonId(): Promise<string | null> {
  const live = await loadLiveCenter();
  return live?.salonId ?? null;
}

export async function opsListBookingLinks(): Promise<OpsBookingLink[]> {
  const salonId = await liveSalonId();
  const sb = panelAdmin();
  if (!salonId || !sb) return [];
  const { data, error } = await sb
    .from('booking_links')
    .select('id, link_key, label, custom_title, payment_mode, deposit_bps, active')
    .eq('salon_id', salonId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as OpsBookingLink[];
}

export async function opsSetBookingEnabled(
  enabled: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const salonId = await liveSalonId();
  const sb = panelAdmin();
  if (!salonId || !sb) return { ok: false, error: 'Sin centro Live' };
  const { error } = await sb
    .from('salons')
    .update({ booking_enabled: enabled })
    .eq('id', salonId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function opsSaveBookingNotify(
  email: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const salonId = await liveSalonId();
  const sb = panelAdmin();
  if (!salonId || !sb) return { ok: false, error: 'Sin centro Live' };
  const cleaned = email.trim().toLowerCase() || null;
  const { error } = await sb
    .from('salons')
    .update({ booking_notify_email: cleaned })
    .eq('id', salonId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function opsSaveBookingAccent(
  accent: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const salonId = await liveSalonId();
  const sb = panelAdmin();
  if (!salonId || !sb) return { ok: false, error: 'Sin centro Live' };
  const hex = accent?.trim().toLowerCase() || null;
  const { error } = await sb
    .from('salons')
    .update({
      booking_accent: hex && hex !== '#006bff' ? hex : null,
      booking_accent_soft: null,
      booking_ink: null,
    })
    .eq('id', salonId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function opsCreateBookingLink(input: {
  label: string;
  paymentMode: 'free' | 'pay_full' | 'pay_deposit';
  depositBps?: number;
  serviceId?: string | null;
  customTitle?: string | null;
}): Promise<{ ok: true; link: OpsBookingLink } | { ok: false; error: string }> {
  const salonId = await liveSalonId();
  const sb = panelAdmin();
  if (!salonId || !sb) return { ok: false, error: 'Sin centro Live' };

  const base = slugifyBooking(input.label || input.customTitle || 'enlace');
  let linkKey = base;
  for (let i = 0; i < 5; i++) {
    const { data, error } = await sb
      .from('booking_links')
      .insert({
        salon_id: salonId,
        link_key: linkKey,
        label: input.label.trim() || null,
        custom_title: input.customTitle?.trim() || null,
        service_id: input.serviceId || null,
        payment_mode: input.paymentMode,
        deposit_bps: input.depositBps ?? 3000,
        active: true,
      })
      .select('id, link_key, label, custom_title, payment_mode, deposit_bps, active')
      .maybeSingle();
    if (!error && data) return { ok: true, link: data as OpsBookingLink };
    if (error && /unique|duplicate/i.test(error.message)) {
      linkKey = `${base}-${Math.random().toString(36).slice(2, 5)}`;
      continue;
    }
    return { ok: false, error: error?.message ?? 'No se pudo crear' };
  }
  return { ok: false, error: 'Clave duplicada' };
}

export async function opsResendBookingEmail(
  appointmentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Ops Live reutiliza la app marlen vía service: devolvemos instrucción clara.
  // La reexpedición real se hace en marlen-app; aquí marcamos intent de reintento
  // actualizando updated_at de la cita para auditoría ligera.
  const salonId = await liveSalonId();
  const sb = panelAdmin();
  if (!salonId || !sb) return { ok: false, error: 'Sin centro Live' };
  const { data, error } = await sb
    .from('appointments')
    .select('id, source')
    .eq('id', appointmentId)
    .eq('salon_id', salonId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: error?.message ?? 'Cita no encontrada' };
  if (data.source !== 'online') {
    return { ok: false, error: 'Solo citas de origen online' };
  }
  await sb
    .from('appointments')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', appointmentId);
  return { ok: true };
}
