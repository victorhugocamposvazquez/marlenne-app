'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/require-session';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { appOriginFromEnv } from '@/lib/app-origin';
import { parseSiteConfig, type SalonSiteConfig, type SalonSiteRow } from '@/lib/web/site-config';
import {
  normalizeSiteSlug,
  publicSiteUrl,
  validateSiteSlug,
  vanitySiteHost,
} from '@/lib/web/site-urls';

type DbRow = {
  id: string;
  salon_id: string;
  slug: string;
  custom_domain: string | null;
  published_at: string | null;
  config: unknown;
  updated_at: string;
};

function mapRow(row: DbRow): SalonSiteRow {
  return {
    id: row.id,
    salonId: row.salon_id,
    slug: row.slug,
    customDomain: row.custom_domain,
    publishedAt: row.published_at,
    config: parseSiteConfig(row.config),
    updatedAt: row.updated_at,
  };
}

export async function loadSalonSite(): Promise<SalonSiteRow | null> {
  const me = await requireRole('admin');
  const sb = createClient();
  const { data, error } = await sb
    .from('salon_sites')
    .select('id, salon_id, slug, custom_domain, published_at, config, updated_at')
    .eq('salon_id', me.salon_id)
    .maybeSingle();
  if (error) {
    console.error('[salon-site] load', error.message);
    return null;
  }
  return data ? mapRow(data as DbRow) : null;
}

/** Público: sitio publicado por slug (o dominio propio). */
export async function loadPublishedSalonSite(slugOrHost: string): Promise<SalonSiteRow | null> {
  const key = slugOrHost.trim().toLowerCase();
  if (!key) return null;
  const sb = createAdminClient();
  let q = sb
    .from('salon_sites')
    .select('id, salon_id, slug, custom_domain, published_at, config, updated_at')
    .not('published_at', 'is', null);
  if (key.includes('.')) {
    q = q.eq('custom_domain', key);
  } else {
    q = q.eq('slug', normalizeSiteSlug(key));
  }
  const { data, error } = await q.maybeSingle();
  if (error || !data) return null;
  return mapRow(data as DbRow);
}

export async function checkSiteSlug(raw: string): Promise<
  | { ok: true; slug: string; available: boolean; message: string }
  | { ok: false; error: string }
> {
  const me = await requireRole('admin');
  const slug = normalizeSiteSlug(raw);
  const v = validateSiteSlug(slug);
  if (!v.ok) return { ok: false, error: v.error };

  const sb = createClient();
  const { data } = await sb
    .from('salon_sites')
    .select('salon_id')
    .eq('slug', slug)
    .maybeSingle();
  const takenByOther = data && (data as { salon_id: string }).salon_id !== me.salon_id;
  if (takenByOther) {
    return {
      ok: true,
      slug,
      available: false,
      message: `${slug}.marlenapp.com ya está ocupado. Prueba ${slug}-madrid`,
    };
  }
  return {
    ok: true,
    slug,
    available: true,
    message: `✓ ${vanitySiteHost(slug)} · también ${publicSiteUrl(slug).replace(/^https?:\/\//, '')}`,
  };
}

export async function saveSalonSiteDraft(input: {
  slug: string;
  config: SalonSiteConfig;
  customDomain?: string | null;
}): Promise<{ ok: true; site: SalonSiteRow; url: string } | { ok: false; error: string }> {
  const me = await requireRole('admin');
  const slug = normalizeSiteSlug(input.slug);
  const v = validateSiteSlug(slug);
  if (!v.ok) return { ok: false, error: v.error };

  const customDomain = (input.customDomain || '').trim().toLowerCase().replace(/^https?:\/\//, '') || null;

  const sb = createClient();
  const { data: clash } = await sb
    .from('salon_sites')
    .select('salon_id')
    .eq('slug', slug)
    .maybeSingle();
  if (clash && (clash as { salon_id: string }).salon_id !== me.salon_id) {
    return { ok: false, error: 'Ese nombre de web ya está en uso' };
  }

  const payload = {
    salon_id: me.salon_id,
    slug,
    custom_domain: customDomain,
    config: input.config,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from('salon_sites')
    .upsert(payload, { onConflict: 'salon_id' })
    .select('id, salon_id, slug, custom_domain, published_at, config, updated_at')
    .single();

  if (error || !data) {
    console.error('[salon-site] save', error?.message);
    return { ok: false, error: error?.message || 'No se ha podido guardar' };
  }

  revalidatePath('/ajustes/marketing/web');
  revalidatePath(`/s/${slug}`);
  return { ok: true, site: mapRow(data as DbRow), url: publicSiteUrl(slug) };
}

export async function publishSalonSite(input: {
  slug: string;
  config: SalonSiteConfig;
  customDomain?: string | null;
}): Promise<{ ok: true; site: SalonSiteRow; url: string } | { ok: false; error: string }> {
  const saved = await saveSalonSiteDraft(input);
  if (!saved.ok) return saved;

  const me = await requireRole('admin');
  const sb = createClient();
  const { data, error } = await sb
    .from('salon_sites')
    .update({ published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('salon_id', me.salon_id)
    .select('id, salon_id, slug, custom_domain, published_at, config, updated_at')
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message || 'No se ha podido publicar' };
  }

  const site = mapRow(data as DbRow);
  revalidatePath('/ajustes/marketing/web');
  revalidatePath(`/s/${site.slug}`);
  return { ok: true, site, url: publicSiteUrl(site.slug, appOriginFromEnv()) };
}

export async function unpublishSalonSite(): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireRole('admin');
  const sb = createClient();
  const { error } = await sb
    .from('salon_sites')
    .update({ published_at: null, updated_at: new Date().toISOString() })
    .eq('salon_id', me.salon_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/ajustes/marketing/web');
  return { ok: true };
}
