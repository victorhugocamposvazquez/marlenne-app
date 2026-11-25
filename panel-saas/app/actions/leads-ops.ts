'use server';

import { revalidatePath } from 'next/cache';
import { panelAdmin } from '@/lib/supabase-admin';

export async function opsSetLeadsEnabled(
  salonId: string,
  enabled: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = panelAdmin();
  if (!sb) return { ok: false, error: 'El panel no tiene acceso a la base' };
  const { data: salon, error: readError } = await sb
    .from('salons')
    .select('id, kind')
    .eq('id', salonId)
    .maybeSingle();
  if (readError) {
    return {
      ok: false,
      error: /feature_leads|kind/i.test(readError.message)
        ? 'Falta aplicar la migración de leads'
        : readError.message,
    };
  }
  if (!salon || salon.kind === 'personal') {
    return { ok: false, error: 'Ese centro no existe' };
  }
  const { error } = await sb
    .from('salons')
    .update({ feature_leads: enabled })
    .eq('id', salonId);
  if (error) {
    return {
      ok: false,
      error: /feature_leads/i.test(error.message)
        ? 'Falta aplicar la migración de leads'
        : error.message,
    };
  }
  revalidatePath('/empresas');
  revalidatePath('/empresas/90001');
  return { ok: true };
}

export async function opsSaveMetaPage(input: {
  salonId: string;
  pageId: string;
  pageName?: string;
  token?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = panelAdmin();
  if (!sb) return { ok: false, error: 'El panel no tiene acceso a la base' };
  const pageId = input.pageId.trim();
  if (!/^\d{5,}$/.test(pageId)) return { ok: false, error: 'El id de la página son solo números' };
  const { data: salon } = await sb.from('salons').select('id, kind').eq('id', input.salonId).maybeSingle();
  if (!salon || salon.kind === 'personal') return { ok: false, error: 'Ese centro no existe' };

  const { data: current } = await sb
    .from('meta_connections')
    .select('page_access_token')
    .eq('salon_id', input.salonId)
    .maybeSingle();
  const token = input.token?.trim() || (current?.page_access_token as string | undefined)?.trim();
  if (!token) return { ok: false, error: 'Pega el token de la página' };

  const { error } = await sb.from('meta_connections').upsert({
    salon_id: input.salonId,
    page_id: pageId,
    page_name: input.pageName?.trim() || null,
    page_access_token: token,
  });
  if (error) {
    return {
      ok: false,
      error: /meta_connections/i.test(error.message)
        ? 'Falta aplicar la migración de leads'
        : error.message,
    };
  }
  revalidatePath('/empresas');
  revalidatePath('/empresas/90001');
  return { ok: true };
}
