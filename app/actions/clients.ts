'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { addToWaitlist as addWaitWrite, resolveWaitlist as resolveWaitWrite } from '@/lib/agenda-write';
import {
  addConsent as addConsentWrite,
  createClientRecord as createWrite,
  updateClientRecord as updateWrite,
} from '@/lib/client-write';

export async function createClientRecord(input: {
  full_name: string;
  phone?: string;
  email?: string;
  tags?: string[];
}) {
  const r = await createWrite(createClient(), input);
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
}) {
  const r = await updateWrite(createClient(), input);
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
