'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/require-session';
import { createClient } from '@/lib/supabase/server';
import { recordOpsAudit } from '@/lib/ops-support-audit';
import { slugifyBooking, sanitizeBookingTitle } from '@/lib/booking/urls';
import type { BookingPaymentMode } from '@/lib/booking/types';

export type BookingLinkRow = {
  id: string;
  link_key: string;
  label: string | null;
  custom_title: string | null;
  service_id: string | null;
  provider_id: string | null;
  payment_mode: BookingPaymentMode;
  deposit_bps: number;
  active: boolean;
};

export async function listBookingLinks(): Promise<BookingLinkRow[]> {
  const me = await requireRole('admin', 'reception');
  const sb = createClient();
  const { data, error } = await sb
    .from('booking_links')
    .select(
      'id, link_key, label, custom_title, service_id, provider_id, payment_mode, deposit_bps, active',
    )
    .eq('salon_id', me.salon_id)
    .order('created_at', { ascending: false });
  if (error) {
    if (/booking_links/i.test(error.message)) return [];
    console.error('[booking_links]', error.message);
    return [];
  }
  return (data ?? []) as BookingLinkRow[];
}

export async function saveBookingLink(input: {
  id?: string | null;
  label?: string;
  customTitle?: string | null;
  serviceId?: string | null;
  providerId?: string | null;
  paymentMode: BookingPaymentMode;
  depositBps?: number;
  active?: boolean;
}): Promise<{ ok: true; link: BookingLinkRow } | { ok: false; error: string }> {
  const me = await requireRole('admin');
  const sb = createClient();

  const paymentMode = input.paymentMode;
  if (!['free', 'pay_full', 'pay_deposit'].includes(paymentMode)) {
    return { ok: false, error: 'Modo de pago no válido' };
  }
  const depositBps = Math.min(10000, Math.max(500, input.depositBps ?? 3000));
  const customTitle = sanitizeBookingTitle(input.customTitle ?? null);
  const label = (input.label ?? '').trim().slice(0, 80) || null;

  if (input.id) {
    const { data, error } = await sb
      .from('booking_links')
      .update({
        label,
        custom_title: customTitle,
        service_id: input.serviceId || null,
        provider_id: input.providerId || null,
        payment_mode: paymentMode,
        deposit_bps: depositBps,
        active: input.active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id)
      .eq('salon_id', me.salon_id)
      .select(
        'id, link_key, label, custom_title, service_id, provider_id, payment_mode, deposit_bps, active',
      )
      .maybeSingle();
    if (error || !data) return { ok: false, error: error?.message ?? 'No se pudo guardar' };
    void recordOpsAudit('salon.booking_link', { salonId: me.salon_id, id: data.id });
    revalidatePath('/ajustes/widget-reservas');
    return { ok: true, link: data as BookingLinkRow };
  }

  const baseKey = slugifyBooking(label || customTitle || 'enlace');
  let linkKey = baseKey;
  for (let i = 0; i < 6; i++) {
    const payload = {
      salon_id: me.salon_id,
      link_key: linkKey,
      label,
      custom_title: customTitle,
      service_id: input.serviceId || null,
      provider_id: input.providerId || null,
      payment_mode: paymentMode,
      deposit_bps: depositBps,
      active: input.active ?? true,
    };
    const { data, error } = await sb
      .from('booking_links')
      .insert(payload)
      .select(
        'id, link_key, label, custom_title, service_id, provider_id, payment_mode, deposit_bps, active',
      )
      .maybeSingle();
    if (!error && data) {
      void recordOpsAudit('salon.booking_link', { salonId: me.salon_id, id: data.id });
      revalidatePath('/ajustes/widget-reservas');
      return { ok: true, link: data as BookingLinkRow };
    }
    if (error && /unique|duplicate/i.test(error.message)) {
      linkKey = `${baseKey}-${Math.random().toString(36).slice(2, 5)}`;
      continue;
    }
    return { ok: false, error: error?.message ?? 'No se pudo crear' };
  }
  return { ok: false, error: 'No se pudo generar una clave única' };
}

export async function deleteBookingLink(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireRole('admin');
  const sb = createClient();
  const { error } = await sb
    .from('booking_links')
    .delete()
    .eq('id', id)
    .eq('salon_id', me.salon_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/ajustes/widget-reservas');
  return { ok: true };
}

export async function saveBookingNotifySettings(input: {
  notifyEmail: string;
  smsReminders: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireRole('admin');
  const sb = createClient();
  const email = input.notifyEmail.trim().toLowerCase() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Email no válido' };
  }
  const { error } = await sb
    .from('salons')
    .update({
      booking_notify_email: email,
      booking_sms_reminders: input.smsReminders,
    })
    .eq('id', me.salon_id);
  if (error) {
    if (/booking_notify_email|booking_sms_reminders/i.test(error.message)) {
      return { ok: false, error: 'Falta aplicar la migración de avisos de booking' };
    }
    return { ok: false, error: error.message };
  }
  revalidatePath('/ajustes/widget-reservas');
  return { ok: true };
}
