'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/require-session';
import { getSession } from '@/lib/queries';
import { createClient } from '@/lib/supabase/server';
import { createClientRecord } from '@/lib/client-write';
import { leadsDesk } from '@/lib/leads-desk';
import { leadsEnabled } from '@/lib/leads-enabled';
import { notifyNewLead } from '@/lib/lead-push';
import { createAdminClient } from '@/lib/supabase/admin';
import { isLikelyLowResAdImage, refreshLeadAdImage } from '@/lib/meta-lead-creative';
import { leadTagsSummary, normalizeLeadDay, parseLeadFormFields, LEAD_CALLBACK_TAG, type LeadChannel, type LeadFormField } from '@/lib/leads';
import type { LeadsListGroup } from '@/lib/leads-list-group';
import { normalizeLeadsListFilter, type LeadsListFilter } from '@/lib/leads-list-query';

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
  callback_at: string | null;
  last_channel: LeadChannel | null;
  client_id: string | null;
  created_at: string;
  deleted_at: string | null;
  form_fields: LeadFormField[];
  meta_lead_id: string | null;
};

export type LeadTrashRow = {
  id: string;
  full_name: string;
  phone: string | null;
  deleted_at: string;
};

export type LeadEventRow = {
  id: string;
  kind: 'call' | 'whatsapp' | 'note' | 'tag' | 'convert' | 'undo';
  body: string | null;
  created_at: string;
  staff_name: string | null;
};

const LEAD_SELECT = 'id, full_name, phone, email, campaign_id, campaign_name, ad_id, ad_name, thumbnail_url, ad_headline, ad_body, tags, callback_at, last_channel, client_id, created_at, deleted_at, form_fields, meta_lead_id';

function leadDetailSelect(opts: { trash: boolean; callback: boolean }) {
  let select = LEAD_SELECT;
  if (!opts.trash) select = select.replace(', deleted_at', '');
  if (!opts.callback) select = select.replace(', callback_at', '');
  return select;
}

const LEAD_LIST_SELECT = 'id, full_name, phone, campaign_name, ad_name, tags, callback_at, last_channel, created_at';
const LEAD_LIST_SELECT_NO_CALLBACK = LEAD_LIST_SELECT.replace(', callback_at', '');

function missingTable(message: string) {
  return /feature_leads|relation .*leads|lead_events|lead_wa_templates/i.test(message);
}

function missingTrashColumn(message: string) {
  return /deleted_at/i.test(message);
}

function missingCallbackColumn(message: string) {
  return /callback_at/i.test(message);
}

const PAGE = 40;

function searchNeedle(raw: string) {
  return raw.trim().replace(/[%,]/g, ' ').slice(0, 80);
}

export async function listLeadsPage(
  input?: string | null | LeadsListFilter,
): Promise<{ rows: LeadRow[]; hasMore: boolean }> {
  const filters = normalizeLeadsListFilter(input);
  const { on, me } = await leadsDesk();
  if (!on) return { rows: [], hasMore: false };
  const sb = createClient();

  const buildQuery = (activeOnly: boolean, withCallback = true) => {
    let query = sb
      .from('leads')
      .select(withCallback ? LEAD_LIST_SELECT : LEAD_LIST_SELECT_NO_CALLBACK)
      .eq('salon_id', me.salon_id)
      .order('created_at', { ascending: false })
      .limit(PAGE + 1);
    if (activeOnly) query = query.is('deleted_at', null);
    if (filters.before) query = query.lt('created_at', filters.before);
    if (filters.tone && filters.tone !== 'todas') {
      if (filters.tone === 'none') query = query.is('last_channel', null);
      else query = query.eq('last_channel', filters.tone);
    }
    if (filters.groupName?.trim()) {
      const col = filters.groupKind === 'ad' ? 'ad_name' : 'campaign_name';
      query = query.eq(col, filters.groupName.trim());
    }
    const needle = searchNeedle(filters.q ?? '');
    if (needle.length >= 2) {
      query = query.or(`full_name.ilike.%${needle}%,phone.ilike.%${needle}%`);
    }
    return query;
  };

  let withCallback = true;
  let activeOnly = true;
  let { data, error } = await buildQuery(activeOnly, withCallback);
  if (error && missingCallbackColumn(error.message)) {
    withCallback = false;
    ({ data, error } = await buildQuery(activeOnly, withCallback));
  }
  if (error && missingTrashColumn(error.message)) {
    activeOnly = false;
    ({ data, error } = await buildQuery(activeOnly, withCallback));
  }
  if (error) {
    if (missingTable(error.message)) return { rows: [], hasMore: false };
    throw new Error(error.message);
  }
  const rows = (data ?? []).map(row => ({
    ...(row as unknown as LeadRow),
    callback_at: (row as unknown as { callback_at?: string | null }).callback_at ?? null,
    deleted_at: null,
    form_fields: [] as LeadFormField[],
    meta_lead_id: null,
  }));
  return { rows: rows.slice(0, PAGE), hasMore: rows.length > PAGE };
}

export async function listLeads(): Promise<LeadRow[]> {
  const page = await listLeadsPage();
  return page.rows;
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
    .is('deleted_at', null)
    .is('last_channel', null);
  if (error) return 0;
  return count ?? 0;
}

function mapLeadRow(raw: Record<string, unknown> | null): LeadRow | null {
  if (!raw) return null;
  return {
    ...(raw as LeadRow),
    callback_at: (raw.callback_at as string | null) ?? null,
    deleted_at: (raw.deleted_at as string | null) ?? null,
    form_fields: parseLeadFormFields(raw.form_fields),
  };
}

const TRASH_PAGE = 30;

export async function listTrashedLeads(before?: string | null): Promise<{ rows: LeadTrashRow[]; hasMore: boolean }> {
  const { on, me } = await leadsDesk();
  if (!on) return { rows: [], hasMore: false };
  const sb = createClient();
  let query = sb
    .from('leads')
    .select('id, full_name, phone, deleted_at')
    .eq('salon_id', me.salon_id)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
    .limit(TRASH_PAGE + 1);
  if (before) query = query.lt('deleted_at', before);
  const { data, error } = await query;
  if (error) {
    if (missingTable(error.message) || /deleted_at/i.test(error.message)) return { rows: [], hasMore: false };
    throw new Error(error.message);
  }
  const rows = (data ?? []) as LeadTrashRow[];
  return { rows: rows.slice(0, TRASH_PAGE), hasMore: rows.length > TRASH_PAGE };
}

export async function getLead(id: string): Promise<LeadRow | null> {
  const { on, me } = await leadsDesk();
  if (!on) return null;
  const sb = createClient();
  let trash = true;
  let callback = true;
  let { data, error } = await sb.from('leads').select(leadDetailSelect({ trash, callback })).eq('id', id).maybeSingle();
  for (let i = 0; i < 2 && error; i += 1) {
    let changed = false;
    if (missingTrashColumn(error.message) && trash) { trash = false; changed = true; }
    if (missingCallbackColumn(error.message) && callback) { callback = false; changed = true; }
    if (!changed) break;
    ({ data, error } = await sb.from('leads').select(leadDetailSelect({ trash, callback })).eq('id', id).maybeSingle());
  }
  if (error) return null;
  let lead = mapLeadRow(data as Record<string, unknown> | null);
  if (!lead) return null;
  const adId = lead.ad_id?.trim() || null;
  if (adId) {
    const { data: ad } = await sb
      .from('meta_ads')
      .select('thumbnail_url, headline, body')
      .eq('salon_id', me.salon_id)
      .eq('ad_id', adId)
      .maybeSingle();
    if (ad) {
      lead = {
        ...lead,
        thumbnail_url: (ad.thumbnail_url as string | null) ?? lead.thumbnail_url,
        ad_headline: lead.ad_headline || ((ad.headline as string | null) ?? null),
        ad_body: lead.ad_body || ((ad.body as string | null) ?? null),
      };
    }
  }
  return lead;
}

/** Después de pintar la ficha: cambia la miniatura por la foto grande, sin frenar la navegación. */
export async function upgradeLeadAdPhoto(leadId: string): Promise<string | null> {
  const { on, me } = await leadsDesk();
  if (!on) return null;
  const sb = createClient();
  const { data } = await sb
    .from('leads')
    .select('id, ad_id, thumbnail_url, campaign_id, campaign_name, ad_name')
    .eq('id', leadId)
    .maybeSingle();
  const adId = (data?.ad_id as string | null)?.trim();
  if (!data?.id || !adId) return null;
  const current = (data.thumbnail_url as string | null) ?? null;
  if (!isLikelyLowResAdImage(current)) return null;
  try {
    const admin = createAdminClient();
    const next = await refreshLeadAdImage(admin, me.salon_id, {
      leadId: data.id as string,
      adId,
      thumbnailUrl: current,
      campaignId: (data.campaign_id as string | null) ?? null,
      campaignName: (data.campaign_name as string | null) ?? null,
      adName: (data.ad_name as string | null) ?? null,
    });
    if (next && next !== current) return next;
  } catch {
    /* Sin token o Graph caído: se queda la miniatura. */
  }
  return null;
}

export async function listLeadEvents(leadId: string): Promise<LeadEventRow[]> {
  const { on } = await leadsDesk();
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

export async function salonLeadWaTemplate(): Promise<string | null> {
  const { on, me } = await leadsDesk();
  if (!on) return null;
  const sb = createClient();
  const { data, error } = await sb
    .from('lead_wa_templates')
    .select('body')
    .eq('salon_id', me.salon_id)
    .eq('scope', 'salon')
    .maybeSingle();
  if (error || !data) return null;
  return (data.body as string | null) ?? null;
}

export async function leadTemplates(input: { campaignId?: string | null; adId?: string | null }) {
  const { on } = await leadsDesk();
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
  revalidatePath('/ajustes/leads');
  if (id) revalidatePath(`/leads/${id}`);
}

export async function createManualLead(input: { fullName: string; phone?: string; campaignName?: string; adName?: string }) {
  const { me, on } = await leadsDesk();
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

export async function listLeadGroupNames(kind: LeadsListGroup): Promise<string[]> {
  const { on, me } = await leadsDesk();
  if (!on) return [];
  const sb = createClient();
  const pKind = kind === 'ad' ? 'ad' : 'campaign';
  const { data, error } = await sb.rpc('lead_group_names', { p_salon_id: me.salon_id, p_kind: pKind });
  if (!error && data?.length) {
    const rows = data as unknown[];
    if (typeof rows[0] === 'string') return rows as string[];
    return (rows as { name: string }[]).map(row => row.name).filter(Boolean);
  }
  const col = kind === 'ad' ? 'ad_name' : 'campaign_name';
  let { data: rows, error: rowErr } = await sb
    .from('leads')
    .select(col)
    .eq('salon_id', me.salon_id)
    .is('deleted_at', null)
    .not(col, 'is', null)
    .limit(500);
  if (rowErr && missingTrashColumn(rowErr.message)) {
    ({ data: rows, error: rowErr } = await sb
      .from('leads')
      .select(col)
      .eq('salon_id', me.salon_id)
      .not(col, 'is', null)
      .limit(500));
  }
  if (rowErr) return [];
  const names = new Set<string>();
  for (const row of rows ?? []) {
    const name = (row as Record<string, string | null>)[col]?.trim();
    if (name) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'es'));
}

export async function listLeadTagWords(): Promise<string[]> {
  const { on, me } = await leadsDesk();
  if (!on) return [];
  const sb = createClient();
  const { data, error } = await sb.rpc('lead_distinct_tags', { p_salon_id: me.salon_id });
  if (!error && data?.length) {
    const rows = data as unknown[];
    if (typeof rows[0] === 'string') return rows as string[];
    return (rows as { tag: string }[]).map(row => row.tag).filter(Boolean);
  }
  let { data: rows, error: rowErr } = await sb
    .from('leads')
    .select('tags')
    .eq('salon_id', me.salon_id)
    .is('deleted_at', null)
    .limit(200);
  if (rowErr && missingTrashColumn(rowErr.message)) {
    ({ data: rows, error: rowErr } = await sb
      .from('leads')
      .select('tags')
      .eq('salon_id', me.salon_id)
      .limit(200));
  }
  if (rowErr) return [];
  const words = new Set<string>();
  for (const row of rows ?? []) {
    for (const tag of (row as { tags?: string[] }).tags ?? []) {
      const trimmed = tag.trim();
      if (trimmed) words.add(trimmed);
    }
  }
  return [...words].sort((a, b) => a.localeCompare(b, 'es'));
}

export async function markLeadChannel(leadId: string, channel: LeadChannel) {
  const { me, on } = await leadsDesk();
  if (!on) return { ok: false as const, error: 'Leads no está activado' };
  const sb = createClient();
  let { data, error } = await sb
    .from('leads')
    .update({ last_channel: channel })
    .eq('id', leadId)
    .eq('salon_id', me.salon_id)
    .select('id')
    .maybeSingle();
  if (error && missingTrashColumn(error.message)) {
    ({ data, error } = await sb
      .from('leads')
      .update({ last_channel: channel })
      .eq('id', leadId)
      .eq('salon_id', me.salon_id)
      .select('id')
      .maybeSingle());
  }
  if (error) return { ok: false as const, error: error.message };
  if (!data?.id) return { ok: false as const, error: 'No se ha podido actualizar el lead' };
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

export async function clearLeadChannel(leadId: string) {
  const { me, on } = await leadsDesk();
  if (!on) return { ok: false as const, error: 'Leads no está activado' };
  const sb = createClient();
  let { data, error } = await sb
    .from('leads')
    .update({ last_channel: null })
    .eq('id', leadId)
    .eq('salon_id', me.salon_id)
    .select('id')
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!data?.id) return { ok: false as const, error: 'No se ha podido actualizar el lead' };
  refresh(leadId);
  return { ok: true as const };
}

export async function addLeadNote(leadId: string, body: string) {
  const { me, on } = await leadsDesk();
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

export async function setLeadTags(leadId: string, tags: string[], callbackOn?: string | null) {
  const { me, on } = await leadsDesk();
  if (!on) return { ok: false as const, error: 'Leads no está activado' };
  const clean = [...new Set(tags.map(t => t.trim()).filter(Boolean))].slice(0, 12);
  const day = clean.includes(LEAD_CALLBACK_TAG) ? normalizeLeadDay(callbackOn) : null;
  const sb = createClient();
  let { error } = await sb.from('leads').update({ tags: clean, callback_at: day }).eq('id', leadId);
  if (error && missingCallbackColumn(error.message)) {
    ({ error } = await sb.from('leads').update({ tags: clean }).eq('id', leadId));
    if (error) return { ok: false as const, error: error.message };
    await sb.from('lead_events').insert({
      salon_id: me.salon_id,
      lead_id: leadId,
      staff_id: me.id,
      kind: 'tag',
      body: leadTagsSummary(clean, null) || 'Sin etiquetas',
    });
    refresh(leadId);
    if (day) return { ok: false as const, error: 'La fecha aún no está en la base. Hay que aplicar la migración de leads.' };
    return { ok: true as const };
  }
  if (error) return { ok: false as const, error: error.message };
  await sb.from('lead_events').insert({
    salon_id: me.salon_id,
    lead_id: leadId,
    staff_id: me.id,
    kind: 'tag',
    body: leadTagsSummary(clean, day) || 'Sin etiquetas',
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
  const { me, on } = await leadsDesk();
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

export async function linkLeadToClient(leadId: string, clientId: string) {
  const { me, on } = await leadsDesk();
  if (!on) return { ok: false as const, error: 'Leads no está activado' };
  const sb = createClient();
  const { data: lead, error } = await sb
    .from('leads')
    .select('id, client_id')
    .eq('id', leadId)
    .eq('salon_id', me.salon_id)
    .maybeSingle();
  if (error || !lead) return { ok: false as const, error: 'No está el lead' };
  const linked = (lead.client_id as string | null) ?? null;
  if (linked && linked !== clientId) {
    return { ok: false as const, error: 'Este lead ya tiene otra ficha de clienta' };
  }
  if (linked === clientId) return { ok: true as const, id: clientId };
  const { data: updated, error: upErr } = await sb
    .from('leads')
    .update({ client_id: clientId })
    .eq('id', leadId)
    .eq('salon_id', me.salon_id)
    .select('id')
    .maybeSingle();
  if (upErr || !updated?.id) return { ok: false as const, error: upErr?.message ?? 'No se ha podido enlazar' };
  await sb.from('lead_events').insert({
    salon_id: me.salon_id,
    lead_id: leadId,
    staff_id: me.id,
    kind: 'convert',
    body: 'Pasada a clienta',
  });
  refresh(leadId);
  revalidatePath('/clientas');
  return { ok: true as const, id: clientId };
}

export async function convertLeadToClient(leadId: string) {
  const { me, on } = await leadsDesk();
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

async function assertLeadSalon(sb: ReturnType<typeof createClient>, salonId: string, leadId: string) {
  const { data, error } = await sb.from('leads').select('id').eq('id', leadId).eq('salon_id', salonId).maybeSingle();
  if (error || !data) return false;
  return true;
}

export async function trashLead(leadId: string) {
  const { me, on } = await leadsDesk();
  if (!on) return { ok: false as const, error: 'Leads no está activado' };
  const sb = createClient();
  if (!(await assertLeadSalon(sb, me.salon_id, leadId))) {
    return { ok: false as const, error: 'No está el lead' };
  }
  const { error } = await sb
    .from('leads')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', leadId)
    .eq('salon_id', me.salon_id)
    .is('deleted_at', null);
  if (error) {
    return {
      ok: false as const,
      error: /deleted_at/i.test(error.message) ? 'Falta aplicar la migración de papelera' : error.message,
    };
  }
  refresh(leadId);
  return { ok: true as const };
}

export async function restoreLead(leadId: string) {
  const { me, on } = await leadsDesk();
  if (!on) return { ok: false as const, error: 'Leads no está activado' };
  const sb = createClient();
  if (!(await assertLeadSalon(sb, me.salon_id, leadId))) {
    return { ok: false as const, error: 'No está el lead' };
  }
  const { error } = await sb
    .from('leads')
    .update({ deleted_at: null })
    .eq('id', leadId)
    .eq('salon_id', me.salon_id)
    .not('deleted_at', 'is', null);
  if (error) {
    return {
      ok: false as const,
      error: /deleted_at/i.test(error.message) ? 'Falta aplicar la migración de papelera' : error.message,
    };
  }
  refresh(leadId);
  return { ok: true as const };
}

export async function purgeLead(leadId: string) {
  const { me, on } = await leadsDesk();
  if (!on) return { ok: false as const, error: 'Leads no está activado' };
  const sb = createClient();
  if (!(await assertLeadSalon(sb, me.salon_id, leadId))) {
    return { ok: false as const, error: 'No está el lead' };
  }
  await sb.from('lead_events').delete().eq('lead_id', leadId);
  const { error } = await sb
    .from('leads')
    .delete()
    .eq('id', leadId)
    .eq('salon_id', me.salon_id)
    .not('deleted_at', 'is', null);
  if (error) {
    return {
      ok: false as const,
      error: /deleted_at/i.test(error.message) ? 'Falta aplicar la migración de papelera' : error.message,
    };
  }
  refresh(leadId);
  return { ok: true as const };
}
