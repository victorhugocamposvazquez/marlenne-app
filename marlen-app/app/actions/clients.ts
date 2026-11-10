'use server';

import { revalidatePath } from 'next/cache';
import { requireCompany } from '@/lib/require-session';
import {
  getClient, listClientAppointments, listConsents, listSalonPackTemplates, listServices,
} from '@/lib/queries';
import { createClient } from '@/lib/supabase/server';
import { addToWaitlist as addWaitWrite, resolveWaitlist as resolveWaitWrite } from '@/lib/agenda-write';
import { syncClientRemindersAction } from '@/app/actions/reminder-sync';
import {
  addConsent as addConsentWrite,
  createClientRecord as createWrite,
  updateClientRecord as updateWrite,
} from '@/lib/client-write';
import { recordOpsAudit } from '@/lib/ops-support-audit';

export async function createClientRecord(input: {
  full_name: string;
  phone?: string;
  email?: string;
  tags?: string[];
}) {
  const r = await createWrite(createClient(), input);
  if (r.ok && r.id) void recordOpsAudit('client.create', { id: r.id, full_name: input.full_name });
  revalidatePath('/clientas');
  return r;
}

export async function addToWaitlist(input: {
  clientId?: string;
  clientName?: string;
  serviceId?: string;
  preference?: string;
}) {
  const r = await addWaitWrite(createClient(), input);
  revalidatePath('/agenda');
  revalidatePath('/hoy');
  return r;
}

export async function updateClientRecord(input: {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  notes?: string;
    tags?: string[];
    sms_opt_in?: boolean;
    birth_date?: string | null;
  prevPhone?: string | null;
}) {
  const r = await updateWrite(createClient(), input);
  if (r.ok) {
    void syncClientRemindersAction(input.id, input.prevPhone);
    void recordOpsAudit('client.update', { id: input.id, full_name: input.full_name });
  }
  revalidatePath('/clientas');
  revalidatePath(`/clientas/${input.id}`);
  return r;
}

export async function addConsent(input: { clientId: string; kind: string }) {
  const r = await addConsentWrite(createClient(), input);
  revalidatePath(`/clientas/${input.clientId}`);
  return r;
}

export async function resolveWaitlist(id: string) {
  const r = await resolveWaitWrite(createClient(), id);
  revalidatePath('/agenda');
  revalidatePath('/hoy');
  return r;
}

/** Ficha completa para abrirla encima de la cita, sin salir de la agenda. */
export async function loadClientFicha(id: string) {
  const me = await requireCompany();
  const canEdit = me.role === 'admin' || me.role === 'reception';
  const { client, treatments, packs } = await getClient(id);
  if (!client) return null;
  const [appointments, consents, templates, services] = await Promise.all([
    listClientAppointments(client.id),
    listConsents(client.id),
    canEdit ? listSalonPackTemplates() : Promise.resolve([]),
    canEdit ? listServices() : Promise.resolve([]),
  ]);
  return { client, treatments, packs, appointments, consents, templates, services, canEdit };
}
