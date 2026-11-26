'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/require-session';
import { createAdminClient } from '@/lib/supabase/admin';
import { leadsEnabled } from '@/lib/leads-enabled';
import { enrichLeadsAdCreative } from '@/lib/meta-lead-creative';
import { leadFieldsFromMeta, leadFormRowsFromMeta } from '@/lib/leads';
import { notifyNewLead } from '@/lib/lead-push';
import { subscribePageToLeadgen } from '@/lib/meta-page-subscribe';
import {
  META_LEADS_PAGE,
  TEST_LEAD_FIELDS,
  graphAfter,
  metaLeadIsFresh,
  metaLeadWhen,
  newestMetaInstant,
  nextImportCursor,
  type MetaSyncCursor,
} from '@/lib/meta-leads-sync';

const GRAPH = 'https://graph.facebook.com/v21.0';

type GraphField = { name?: string; values?: string[] };

type GraphLead = {
  id?: string;
  created_time?: string;
  ad_id?: string;
  ad_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  field_data?: GraphField[];
};

export type MetaSyncResult =
  | { ok: true; imported: number; skipped: number; done: boolean; cursor: MetaSyncCursor | null }
  | { ok: false; error: string };

async function graphGet<T>(path: string, token: string, query: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH}/${path}`);
  url.searchParams.set('access_token', token);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  const res = await fetch(url, { cache: 'no-store' });
  const body = await res.json().catch(() => null) as { error?: { message?: string } } | null;
  if (!res.ok) {
    throw new Error(body?.error?.message || 'Facebook no ha respondido');
  }
  return body as T;
}

async function listFormIds(pageId: string, token: string) {
  const ids: string[] = [];
  let after: string | null = null;
  for (let hop = 0; hop < 8; hop++) {
    const query: Record<string, string> = { fields: 'id', limit: '50' };
    if (after) query.after = after;
    const page = await graphGet<{ data?: { id?: string }[]; paging?: { cursors?: { after?: string }; next?: string } }>(
      `${encodeURIComponent(pageId)}/leadgen_forms`,
      token,
      query,
    );
    for (const row of page.data ?? []) {
      const id = row.id?.trim();
      if (id) ids.push(id);
    }
    after = graphAfter(page.paging);
    if (!after) break;
  }
  return ids;
}

async function savePage(
  salonId: string,
  rows: GraphLead[],
  token?: string | null,
) {
  const admin = createAdminClient();
  const ids = rows.map(row => row.id?.trim()).filter((id): id is string => Boolean(id));
  if (!ids.length) return { imported: 0, skipped: 0 };
  const { data: existing, error: readError } = await admin
    .from('leads')
    .select('meta_lead_id')
    .eq('salon_id', salonId)
    .in('meta_lead_id', ids);
  if (readError) throw new Error(readError.message);
  const known = new Set((existing ?? []).map(row => row.meta_lead_id as string));
  const fresh = rows.filter(row => {
    const id = row.id?.trim();
    return id && !known.has(id);
  });
  if (!fresh.length) return { imported: 0, skipped: ids.length };
  const payload = fresh.map(row => {
    const who = leadFieldsFromMeta(row.field_data);
    const when = metaLeadWhen(row.created_time);
    const formFields = leadFormRowsFromMeta(row.field_data);
    return {
      salon_id: salonId,
      full_name: who.fullName,
      phone: who.phone,
      email: who.email,
      meta_lead_id: row.id!.trim(),
      campaign_id: row.campaign_id ?? null,
      campaign_name: row.campaign_name ?? null,
      ad_id: row.ad_id ?? null,
      ad_name: row.ad_name ?? null,
      form_fields: formFields,
      ...(when ? { created_at: when } : {}),
    };
  });
  const { data: inserted, error } = await admin
    .from('leads')
    .insert(payload)
    .select('id, meta_lead_id, full_name, phone, campaign_name, ad_name, created_at');
  if (error) throw new Error(error.message);
  const whenByMeta = new Map(payload.map(row => [row.meta_lead_id, row.created_at ?? null]));
  await Promise.all((inserted ?? []).map(async row => {
    const when = whenByMeta.get(row.meta_lead_id as string);
    if (!metaLeadIsFresh(when)) return;
    await notifyNewLead({
      salonId,
      leadId: row.id as string,
      name: (row.full_name as string) || 'Nuevo lead',
      phone: (row.phone as string | null) ?? null,
      campaign: (row.campaign_name as string | null) ?? null,
      ad: (row.ad_name as string | null) ?? null,
      fromMeta: true,
    }).catch(() => undefined);
  }));

  const access = token?.trim();
  if (access) {
    const seen = new Set<string>();
    for (const row of fresh) {
      const adId = row.ad_id?.trim();
      if (!adId || seen.has(adId)) continue;
      seen.add(adId);
      await enrichLeadsAdCreative(admin, salonId, adId, access, {
        campaignId: row.campaign_id ?? null,
        campaignName: row.campaign_name ?? null,
        adName: row.ad_name ?? null,
      }).catch(() => undefined);
    }
  }

  return { imported: fresh.length, skipped: ids.length - fresh.length };
}

export async function importMetaLeadsPage(cursor?: MetaSyncCursor | null): Promise<MetaSyncResult> {
  const me = await requireRole('admin', 'reception');
  if (!await leadsEnabled(me.salon_id)) {
    return { ok: false, error: 'Leads no está activado para este centro' };
  }
  const admin = createAdminClient();
  const { data: conn, error } = await admin
    .from('meta_connections')
    .select('page_id, page_access_token')
    .eq('salon_id', me.salon_id)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  const pageId = (conn?.page_id as string | undefined)?.trim();
  const token = (conn?.page_access_token as string | undefined)?.trim();
  if (!pageId || !token) {
    return { ok: false, error: 'Conecta la página de Facebook en Ajustes. Mientras, puedes crear un lead de prueba.' };
  }

  let forms: string[];
  try {
    forms = await listFormIds(pageId, token);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'No se han podido leer los formularios' };
  }
  if (!forms.length) {
    return { ok: true, imported: 0, skipped: 0, done: true, cursor: null };
  }

  let formAt = cursor?.formAt ?? 0;
  let after = cursor?.after ?? null;
  if (formAt < 0 || formAt >= forms.length) formAt = 0;
  let imported = 0;
  let skipped = 0;

  for (let hop = 0; hop < 8 && formAt < forms.length; hop++) {
    let page: { data?: GraphLead[]; paging?: { cursors?: { after?: string }; next?: string } };
    try {
      const query: Record<string, string> = {
        fields: 'id,created_time,ad_id,ad_name,campaign_id,campaign_name,field_data',
        limit: String(META_LEADS_PAGE),
      };
      if (after) query.after = after;
      page = await graphGet(`${encodeURIComponent(forms[formAt])}/leads`, token, query);
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'No se han podido leer los leads' };
    }
    try {
      const saved = await savePage(me.salon_id, page.data ?? [], token);
      imported += saved.imported;
      skipped += saved.skipped;
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'No se han podido guardar' };
    }
    const step = nextImportCursor({
      formCount: forms.length,
      formAt,
      pageAfter: graphAfter(page.paging),
    });
    if (imported > 0 || step.done) {
      revalidatePath('/leads');
      revalidatePath('/hoy');
      return {
        ok: true,
        imported,
        skipped,
        done: step.done,
        cursor: step.done ? null : step.cursor,
      };
    }
    formAt = step.cursor.formAt;
    after = step.cursor.after;
  }

  revalidatePath('/leads');
  const more = formAt < forms.length;
  return {
    ok: true,
    imported,
    skipped,
    done: !more,
    cursor: more ? { formAt, after } : null,
  };
}

const RECENT_FORMS = 40;
/** Con la app abierta: basta con los formularios más recientes. */
const RECENT_FORMS_INBOX = 8;

async function pullSalonRecent(salonId: string, maxForms = RECENT_FORMS) {
  const admin = createAdminClient();
  const { data: conn, error } = await admin
    .from('meta_connections')
    .select('page_id, page_access_token')
    .eq('salon_id', salonId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const pageId = (conn?.page_id as string | undefined)?.trim();
  const token = (conn?.page_access_token as string | undefined)?.trim();
  if (!pageId || !token) return { imported: 0, newest: null as string | null };
  await subscribePageToLeadgen(pageId, token).catch(() => undefined);
  const forms = (await listFormIds(pageId, token)).slice(0, maxForms);
  let imported = 0;
  const times: (string | null | undefined)[] = [];
  for (const formId of forms) {
    try {
      const page = await graphGet<{ data?: GraphLead[] }>(`${encodeURIComponent(formId)}/leads`, token, {
        fields: 'id,created_time,ad_id,ad_name,campaign_id,campaign_name,field_data',
        limit: String(META_LEADS_PAGE),
      });
      for (const row of page.data ?? []) times.push(row.created_time);
      const saved = await savePage(salonId, page.data ?? [], token);
      imported += saved.imported;
    } catch {
      /* Un formulario caído no frena al resto. */
    }
  }
  return { imported, newest: newestMetaInstant(times) };
}

/** Mientras la app está abierta: los leads nuevos entran sin pulsar nada. */
export async function pullMyRecentMetaLeads(): Promise<
  { ok: true; imported: number; newest: string | null } | { ok: false; error: string }
> {
  const me = await requireRole('admin', 'reception');
  if (!await leadsEnabled(me.salon_id)) return { ok: true, imported: 0, newest: null };
  try {
    const pulled = await pullSalonRecent(me.salon_id, RECENT_FORMS_INBOX);
    return { ok: true, imported: pulled.imported, newest: pulled.newest };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'No se han podido traer los leads' };
  }
}

/** Con el móvil cerrado: el cron de cada minuto hace lo mismo en todos los centros. */
export async function pullAllRecentMetaLeads(): Promise<{ imported: number; salons: number; error?: string }> {
  const admin = createAdminClient();
  const { data: conns, error } = await admin.from('meta_connections').select('salon_id');
  if (error) return { imported: 0, salons: 0, error: error.message };
  const salonIds = [...new Set((conns ?? []).map(row => row.salon_id as string).filter(Boolean))];
  if (!salonIds.length) return { imported: 0, salons: 0 };
  const { data: salons, error: salonError } = await admin
    .from('salons')
    .select('id, feature_leads')
    .in('id', salonIds);
  if (salonError) return { imported: 0, salons: 0, error: salonError.message };
  const open = (salons ?? []).filter(row => row.feature_leads).map(row => row.id as string);
  let imported = 0;
  let firstError: string | undefined;
  for (const salonId of open) {
    try {
      imported += (await pullSalonRecent(salonId)).imported;
    } catch (err) {
      firstError ??= err instanceof Error ? err.message : 'No se han podido traer los leads';
    }
  }
  if (imported > 0) {
    revalidatePath('/leads');
    revalidatePath('/hoy');
  }
  return { imported, salons: open.length, ...(firstError ? { error: firstError } : {}) };
}

export async function createTestLead(): Promise<{ ok: true; id: string; via: 'meta' | 'local' } | { ok: false; error: string }> {
  const me = await requireRole('admin', 'reception');
  if (!await leadsEnabled(me.salon_id)) {
    return { ok: false, error: 'Leads no está activado para este centro' };
  }
  const admin = createAdminClient();
  const { data: conn } = await admin
    .from('meta_connections')
    .select('page_id, page_access_token')
    .eq('salon_id', me.salon_id)
    .maybeSingle();
  const pageId = (conn?.page_id as string | undefined)?.trim();
  const token = (conn?.page_access_token as string | undefined)?.trim();

  if (pageId && token) {
    try {
      const forms = await listFormIds(pageId, token);
      const formId = forms[0];
      if (formId) {
        const url = new URL(`${GRAPH}/${encodeURIComponent(formId)}/test_leads`);
        url.searchParams.set('access_token', token);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field_data: TEST_LEAD_FIELDS }),
          cache: 'no-store',
        });
        const body = await res.json().catch(() => null) as { id?: string; error?: { message?: string } } | null;
        if (res.ok && body?.id) {
          const lead = await graphGet<GraphLead>(encodeURIComponent(body.id), token, {
            fields: 'id,created_time,ad_id,ad_name,campaign_id,campaign_name,field_data',
          });
          let imported = 0;
          try {
            const saved = await savePage(me.salon_id, [lead.id ? lead : { id: body.id, field_data: TEST_LEAD_FIELDS }], token);
            imported = saved.imported;
          } catch {
            imported = 0;
          }
          const { data: row } = await admin
            .from('leads')
            .select('id')
            .eq('salon_id', me.salon_id)
            .eq('meta_lead_id', body.id)
            .maybeSingle();
          if (row?.id) {
            revalidatePath('/leads');
            revalidatePath('/hoy');
            return { ok: true, id: row.id as string, via: 'meta' };
          }
        }
      }
    } catch {
      /* Si Meta no deja el de prueba, se crea uno en la bandeja. */
    }
  }

  const { data, error } = await admin.from('leads').insert({
    salon_id: me.salon_id,
    full_name: 'Lead de prueba',
    phone: '+34600000000',
    email: 'prueba@marlenne.test',
    campaign_name: 'Prueba',
    ad_name: 'Prueba',
    tags: ['Prueba'],
  }).select('id').single();
  if (error || !data?.id) return { ok: false, error: error?.message ?? 'No se ha podido crear' };
  await notifyNewLead({
    salonId: me.salon_id,
    leadId: data.id as string,
    name: 'Lead de prueba',
    campaign: 'Prueba',
  }).catch(() => undefined);
  revalidatePath('/leads');
  revalidatePath('/hoy');
  return { ok: true, id: data.id as string, via: 'local' };
}
