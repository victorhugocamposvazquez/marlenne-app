'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/require-session';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { leadsEnabled } from '@/lib/leads-enabled';
import { metaAppConfigured } from '@/lib/meta-oauth';

export type MetaConnectStatus = {
  enabled: boolean;
  configured: boolean;
  pageId: string | null;
  pageName: string | null;
  adAccountId: string | null;
  adAccountName: string | null;
  choices: { id: string; name: string }[];
};

const EMPTY: MetaConnectStatus = {
  enabled: false,
  configured: false,
  pageId: null,
  pageName: null,
  adAccountId: null,
  adAccountName: null,
  choices: [],
};

export async function metaConnectStatus(): Promise<MetaConnectStatus> {
  const me = await requireRole('admin');
  const enabled = await leadsEnabled(me.salon_id);
  const configured = metaAppConfigured({
    appId: process.env.META_APP_ID,
    appSecret: process.env.META_APP_SECRET,
  });
  if (!enabled) return { ...EMPTY, configured };
  const sb = createClient();
  const { data } = await sb
    .from('meta_connections')
    .select('page_id, page_name, ad_account_id, ad_account_name')
    .eq('salon_id', me.salon_id)
    .maybeSingle();
  let choices: { id: string; name: string }[] = [];
  try {
    const admin = createAdminClient();
    const { data: pending } = await admin
      .from('meta_page_choices')
      .select('page_id, page_name')
      .eq('salon_id', me.salon_id);
    choices = (pending ?? []).map(row => ({
      id: row.page_id as string,
      name: (row.page_name as string | null)?.trim() || 'Página de Facebook',
    }));
  } catch {
    choices = [];
  }
  return {
    enabled,
    configured,
    pageId: (data?.page_id as string | undefined) ?? null,
    pageName: (data?.page_name as string | null) ?? null,
    adAccountId: (data?.ad_account_id as string | null) ?? null,
    adAccountName: (data?.ad_account_name as string | null) ?? null,
    choices,
  };
}

export async function chooseMetaPage(pageId: string) {
  const me = await requireRole('admin');
  if (!await leadsEnabled(me.salon_id)) {
    return { ok: false as const, error: 'Leads no está activado para este centro' };
  }
  const admin = createAdminClient();
  const { data: choice, error } = await admin
    .from('meta_page_choices')
    .select('page_id, page_name, page_access_token, ad_account_id, ad_account_name')
    .eq('salon_id', me.salon_id)
    .eq('page_id', pageId)
    .maybeSingle();
  if (error || !choice) return { ok: false as const, error: 'Esa página ya no está disponible. Vuelve a conectar.' };
  const { error: saveError } = await admin.from('meta_connections').upsert({
    salon_id: me.salon_id,
    page_id: choice.page_id,
    page_name: choice.page_name,
    page_access_token: choice.page_access_token,
    ad_account_id: choice.ad_account_id,
    ad_account_name: choice.ad_account_name,
  });
  if (saveError) return { ok: false as const, error: saveError.message };
  await admin.from('meta_page_choices').delete().eq('salon_id', me.salon_id);
  revalidatePath('/ajustes');
  revalidatePath('/ajustes/leads');
  revalidatePath('/leads');
  return { ok: true as const };
}

export async function disconnectMetaPage() {
  const me = await requireRole('admin');
  const admin = createAdminClient();
  await admin.from('meta_connections').delete().eq('salon_id', me.salon_id);
  await admin.from('meta_page_choices').delete().eq('salon_id', me.salon_id);
  revalidatePath('/ajustes');
  revalidatePath('/ajustes/leads');
  return { ok: true as const };
}
