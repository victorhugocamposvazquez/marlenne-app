'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/require-session';
import { getSession } from '@/lib/queries';
import { createClient } from '@/lib/supabase/server';
import { createClientRecord } from '@/lib/client-write';
import { leadsEnabled } from '@/lib/leads-enabled';
import { notifyNewLead } from '@/lib/lead-push';
import type { LeadChannel } from '@/lib/leads';

export type LeadRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  thumbnail_url: string | null;
  ad_headline: string | null;
  ad_body: string | null;
  tags: string[];
  last_channel: LeadChannel | null;
  client_id: string | null;
  created_at: string;
};

export type LeadEventRow = {
  id: string;
  kind: 'call' | 'whatsapp' | 'note' | 'tag' | 'convert';
  body: string | null;
  created_at: string;
  staff_name: string | null;
};

const LEAD_SELECT = 'id, full_name, phone, email, campaign_id, campaign_name, ad_id, ad_name, thumbnail_url, ad_headline, ad_body, tags, last_channel, client_id, created_at';

function missingTable(message: string) {
  return /feature_leads|relation .*leads|lead_events|lead_wa_templates/i.test(message);
}

async function desk() {
  const me = await requireRole('admin', 'reception');
  const on = await leadsEnabled(me.salon_id);
  return { me, on };
}

export async function listLeads(): Promise<LeadRow[]> {
  const { on } = await desk();
  if (!on) return [];
  const sb = createClient();
  const { data, error } = await sb
    .from('leads')
    .select(LEAD_SELECT)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    if (missingTable(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as LeadRow[];
}

export async function countUntouchedLeads(): Promise<number> {
  const me = await getSession();
  if (!me || me.role === 'provider') return 0;
  const on = await leadsEnabled(me.salon_id);
  if (!on) return 0;
  const sb = createClient();
  const { count, error } = await sb
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .is('last_channel', null);
  if (error) return 0;
  return count ?? 0;
}

export async function getLead(id: string): Promise<LeadRow | null> {
  const { on } = await desk();
  if (!on) return null;
  const sb = createClient();
  const { data, error } = await sb.from('leads').select(LEAD_SELECT).eq('id', id).maybeSingle();
  if (error) return null;
  return (data as LeadRow | null) ?? null;
}

export async function listLeadEvents(leadId: string): Promise<LeadEventRow[]> {
  const { on } = await desk();
  if (!on) return [];
  const sb = createClient();
  const { data, error } = await sb
    .from('lead_events')
    .select('id, kind, body, created_at, staff:staff_id(full_name)')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(80);
  if (error) return [];
  return (data ?? []).map(row => {
    const staff = row.staff as { full_name?: string } | { full_name?: string }[] | null;
    const one = Array.isArray(staff) ? staff[0] : staff;
    return {
      id: row.id as string,
      kind: row.kind as LeadEventRow['kind'],
      body: (row.body as string | null) ?? null,
      created_at: row.created_at as string,
      staff_name: one?.full_name ?? null,
    };
  });
}

export async function leadTemplates(input: { campaignId?: string | null; adId?: string | null }) {
  const { on } = await desk();
  if (!on) return { ad: null as string | null, campaign: null as string | null, salon: null as string | null };
  const sb = createClient();
  const { data, error } = await sb.from('lead_wa_templates').select('scope, campaign_id, ad_id, body');
  if (error || !data) return { ad: null, campaign: null, salon: null };
  const rows = data as { scope: string; campaign_id: string | null; ad_id: string | null; body: string }[];
  return {
    ad: rows.find(r => r.scope === 'ad' && r.ad_id && r.ad_id === input.adId)?.body ?? null,
    campaign: rows.find(r => r.scope === 'campaign' && r.campaign_id && r.campaign_id === input.campaignId)?.body ?? null,
    salon: rows.find(r => r.scope === 'salon')?.body ?? null,
  };
}

function refresh(id?: string) {
  revalidatePath('/leads');
  revalidatePath('/hoy');
  if (id) revalidatePath(`/leads/${id}`);
}

export async function createManualLead(input: { fullName: string; phone?: string; campaignName?: string; adName?: string }) {
  const { me, on } = await desk();
  if (!on) return { ok: false as const, error: 'Leads no está activado para este centro' };
  const name = input.fullName.trim();
  if (name.length < 2) return { ok: false as const, error: 'Pon al menos el nombre' };
  const sb = createClient();
  const { data, error } = await sb.from('leads').insert({
    salon_id: me.salon_id,
    full_name: name,
    phone: input.phone?.trim() || null,
    campaign_name: input.campaignName?.trim() || null,
    ad_name: input.adName?.trim() || null,
  }).select('id').single();
  if (error) {
    return { ok: false as const, error: missingTable(error.message) ? 'Falta aplicar la migración de leads' : error.message };
  }
  await notifyNewLead({
    salonId: me.salon_id,
    leadId: data.id as string,
    name,
    campaign: input.campaignName,
    ad: input.adName,
  }).catch(() => undefined);
  refresh(data.id as string);
  return { ok: true as const, id: data.id as string };
}

export async function markLeadChannel(leadId: string, channel: LeadChannel) {
  const { me, on } = await desk();
  if (!on) return { ok: false as const, error: 'Leads no está activado' };
  const sb = createClient();
  const { error } = await sb.from('leads').update({ last_channel: channel }).eq('id', leadId);
  if (error) return { ok: false as const, error: error.message };
  await sb.from('lead_events').insert({
    salon_id: me.salon_id,
    lead_id: leadId,
    staff_id: me.id,
    kind: channel,
    body: channel === 'call' ? 'Llamada' : 'WhatsApp',
  });
  refresh(leadId);
  return { ok: true as const };
}

export async function addLeadNote(leadId: string, body: string) {
  const { me, on } = await desk();
  if (!on) return { ok: false as const, error: 'Leads no está activado' };
  const text = body.trim();
  if (text.length < 2) return { ok: false as const, error: 'Escribe la nota' };
  const sb = createClient();
  const { error } = await sb.from('lead_events').insert({
    salon_id: me.salon_id,
    lead_id: leadId,
    staff_id: me.id,
    kind: 'note',
    body: text.slice(0, 2000),
  });
  if (error) return { ok: false as const, error: error.message };
  refresh(leadId);
  return { ok: true as const };
}

export async function setLeadTags(leadId: string, tags: string[]) {
  const { me, on } = await desk();
  if (!on) return { ok: false as const, error: 'Leads no está activado' };
  const clean = [...new Set(tags.map(t => t.trim()).filter(Boolean))].slice(0, 12);
  const sb = createClient();
  const { error } = await sb.from('leads').update({ tags: clean }).eq('id', leadId);
  if (error) return { ok: false as const, error: error.message };
  await sb.from('lead_events').insert({
    salon_id: me.salon_id,
    lead_id: leadId,
    staff_id: me.id,
    kind: 'tag',
    body: clean.join(', ') || 'Sin etiquetas',
  });
  refresh(leadId);
  return { ok: true as const };
}

export async function saveLeadTemplate(input: {
  scope: 'salon' | 'campaign' | 'ad';
  campaignId?: string | null;
  adId?: string | null;
  body: string;
}) {
  const { me, on } = await desk();
  if (!on) return { ok: false as const, error: 'Leads no está activado' };
  const text = input.body.trim();
  if (text.length < 2) return { ok: false as const, error: 'Escribe la plantilla' };
  if (text.length > 800) return { ok: false as const, error: 'Máximo 800 caracteres' };
  const sb = createClient();
  const existingQuery = sb.from('lead_wa_templates').select('id').eq('scope', input.scope);
  const { data: existing } = input.scope === 'campaign'
    ? await existingQuery.eq('campaign_id', input.campaignId ?? '').maybeSingle()
    : input.scope === 'ad'
      ? await existingQuery.eq('ad_id', input.adId ?? '').maybeSingle()
      : await existingQuery.maybeSingle();
  const row = {
    salon_id: me.salon_id,
    scope: input.scope,
    campaign_id: input.scope === 'campaign' ? input.campaignId ?? null : null,
    ad_id: input.scope === 'ad' ? input.adId ?? null : null,
    body: text,
  };
  const { error } = existing?.id
    ? await sb.from('lead_wa_templates').update({ body: text }).eq('id', existing.id)
    : await sb.from('lead_wa_templates').insert(row);
  if (error) return { ok: false as const, error: error.message };
  refresh();
  return { ok: true as const };
}

export async function convertLeadToClient(leadId: string) {
  const { me, on } = await desk();
  if (!on) return { ok: false as const, error: 'Leads no está activado' };
  const sb = createClient();
  const { data: lead, error } = await sb.from('leads').select('id, full_name, phone, email, client_id').eq('id', leadId).maybeSingle();
  if (error || !lead) return { ok: false as const, error: 'No está el lead' };
  if (lead.client_id) return { ok: true as const, id: lead.client_id as string };
  const created = await createClientRecord(sb, {
    full_name: lead.full_name as string,
    phone: (lead.phone as string | null) ?? undefined,
    email: (lead.email as string | null) ?? undefined,
    tags: ['Lead'],
  });
  if (!created.id) return { ok: false as const, error: created.error ?? 'No se ha podido crear' };
  await sb.from('leads').update({ client_id: created.id }).eq('id', leadId);
  await sb.from('lead_events').insert({
    salon_id: me.salon_id,
    lead_id: leadId,
    staff_id: me.id,
    kind: 'convert',
    body: 'Pasada a clienta',
  });
  refresh(leadId);
  revalidatePath('/clientas');
  return { ok: true as const, id: created.id };
}
