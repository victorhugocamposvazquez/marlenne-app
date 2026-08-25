'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  cancelAppointment as cancelWrite,
  closeSession as closeWrite,
  createAppointment as createWrite,
  slotsFor as slotsWrite,
  updateAppointmentNote as noteWrite,
  updateStatus as statusWrite,
} from '@/lib/agenda-write';
import { moveAppointment as moveAppointmentRpc } from '@/lib/move-appointment';

function touchAgenda() {
  revalidatePath('/agenda');
  revalidatePath('/hoy');
}

/** Mover una cita: nueva hora y/o nueva profesional. La persistencia es el RPC. */
export async function moveAppointment({
  id, date, startMin, providerId,
}: { id: string; date: string; startMin: number; providerId: string }) {
  const r = await moveAppointmentRpc(createClient(), { id, date, startMin, providerId });
  touchAgenda();
  return r;
}

/**
 * Huecos que caben en la jornada de la profesional, ya sin solapes ni bloqueos.
 * La voz y cualquier caller servidor siguen pasando por aquí.
 */
export async function slotsFor(
  providerId: string, date: string, durationMin: number, excludeId?: string,
) {
  return slotsWrite(createClient(), providerId, date, durationMin, excludeId);
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
  const id = String(formData.get('id'));
  const status = String(formData.get('status'));
  await statusWrite(createClient(), id, status);
  touchAgenda();
}

/** La misma cosa desde voz, que necesita saber si ha fallado. */
export async function updateStatus(id: string, status: string) {
  const r = await statusWrite(createClient(), id, status);
  touchAgenda();
  return r;
}

export async function createAppointment(input: {
  clientId?: string; clientName?: string; serviceId: string; providerId: string;
  date: string; startMin: number; durationMin?: number; priceCents?: number;
  note?: string;
}) {
  const r = await createWrite(createClient(), input);
  touchAgenda();
  revalidatePath('/clientas');
  return r;
}

export async function cancelAppointment(id: string) {
  const r = await cancelWrite(createClient(), id);
  touchAgenda();
  return r;
}

export async function updateAppointmentNote(id: string, note: string) {
  const r = await noteWrite(createClient(), id, note);
  touchAgenda();
  return r;
}

/** Marca la cita como hecha y, si el trigger abre tratamiento, guarda la sesión. */
export async function closeSession(input: {
  appointmentId: string;
  params?: Record<string, string>;
  note?: string;
  measurements?: { metric: string; value?: number; text?: string; unit?: string }[];
}) {
  const r = await closeWrite(createClient(), input);
  touchAgenda();
  revalidatePath('/clientas');
  return r;
}
