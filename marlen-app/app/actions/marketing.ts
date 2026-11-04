'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/require-session';
import { createClient } from '@/lib/supabase/server';
import { appOriginFromEnv } from '@/lib/app-origin';
import { publicLogoUrl } from '@/lib/salon-branding';
import {
  publicCreativeUrl,
  type CreativePayload,
  type MarketingBrand,
  type MarketingCreativeRow,
  type MarketingFormat,
  type MarketingKind,
  type MarketingStyleId,
} from '@/lib/marketing/types';
import { MARKETING_FORMATS, MARKETING_KINDS, MARKETING_STYLE_IDS } from '@/lib/marketing/types';

function isKind(v: string): v is MarketingKind {
  return (MARKETING_KINDS as readonly string[]).includes(v);
}
function isFormat(v: string): v is MarketingFormat {
  return (MARKETING_FORMATS as readonly string[]).includes(v);
}
function isStyle(v: string): v is MarketingStyleId {
  return (MARKETING_STYLE_IDS as readonly string[]).includes(v);
}

export async function loadMarketingBrand(): Promise<MarketingBrand> {
  const me = await requireRole('admin');
  const sb = createClient();
  const { data, error } = await sb
    .from('salons')
    .select('id, name, logo_path, booking_slug, booking_accent')
    .eq('id', me.salon_id)
    .maybeSingle();

  let row = data as {
    id?: string;
    name?: string | null;
    logo_path?: string | null;
    booking_slug?: string | null;
    booking_accent?: string | null;
  } | null;

  if (error && /booking_accent/i.test(error.message)) {
    const retry = await sb
      .from('salons')
      .select('id, name, logo_path, booking_slug')
      .eq('id', me.salon_id)
      .maybeSingle();
    row = { ...(retry.data as object), booking_accent: null } as typeof row;
  }

  return {
    salonId: me.salon_id,
    salonName: (row?.name ?? '').trim() || 'Tu centro',
    logoUrl: publicLogoUrl(row?.logo_path ?? null),
    accent: (row?.booking_accent ?? '').trim() || '#ff2455',
    bookingSlug: row?.booking_slug ?? null,
    origin: appOriginFromEnv(),
  };
}

export async function listMarketingCreatives(): Promise<MarketingCreativeRow[]> {
  const me = await requireRole('admin');
  const sb = createClient();
  const { data, error } = await sb
    .from('marketing_creatives')
    .select('id, kind, style_id, format, payload, image_path, created_at')
    .eq('salon_id', me.salon_id)
    .order('created_at', { ascending: false })
    .limit(60);

  if (error) {
    if (/marketing_creatives/i.test(error.message)) return [];
    console.error('[marketing_creatives]', error.message);
    return [];
  }

  return (data ?? []).map(row => {
    const r = row as {
      id: string;
      kind: MarketingKind;
      style_id: MarketingStyleId;
      format: MarketingFormat;
      payload: CreativePayload;
      image_path: string | null;
      created_at: string;
    };
    return {
      id: r.id,
      kind: r.kind,
      style_id: r.style_id,
      format: r.format,
      payload: (r.payload ?? {}) as CreativePayload,
      image_path: r.image_path,
      image_url: publicCreativeUrl(r.image_path),
      created_at: r.created_at,
    };
  });
}

export async function saveMarketingCreative(input: {
  kind: string;
  styleId: string;
  format: string;
  payload: CreativePayload;
  imagePath: string;
  bookingLinkId?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const me = await requireRole('admin');
  if (!isKind(input.kind)) return { ok: false, error: 'Tipo no válido' };
  if (!isStyle(input.styleId)) return { ok: false, error: 'Estilo no válido' };
  if (!isFormat(input.format)) return { ok: false, error: 'Formato no válido' };
  if (!input.imagePath.startsWith(`${me.salon_id}/`)) {
    return { ok: false, error: 'Ruta de imagen no válida' };
  }

  const payload: CreativePayload = {
    headline: (input.payload.headline ?? '').trim().slice(0, 80),
    subline: (input.payload.subline ?? '').trim().slice(0, 120),
    priceLabel: (input.payload.priceLabel ?? '').trim().slice(0, 40),
    ctaLabel: (input.payload.ctaLabel ?? '').trim().slice(0, 40) || 'Reservar',
    ctaUrl: (input.payload.ctaUrl ?? '').trim().slice(0, 500),
    kicker: (input.payload.kicker ?? '').trim().slice(0, 60) || undefined,
    caption: (input.payload.caption ?? '').trim().slice(0, 160) || undefined,
    serviceId: input.payload.serviceId ?? null,
    packTemplateId: input.payload.packTemplateId ?? null,
    staffId: input.payload.staffId ?? null,
  };

  const sb = createClient();
  const { data, error } = await sb
    .from('marketing_creatives')
    .insert({
      salon_id: me.salon_id,
      kind: input.kind,
      style_id: input.styleId,
      format: input.format,
      payload,
      image_path: input.imagePath,
      booking_link_id: input.bookingLinkId ?? null,
      created_by: me.id,
    })
    .select('id')
    .maybeSingle();

  if (error) {
    if (/marketing_creatives/i.test(error.message)) {
      return { ok: false, error: 'Falta aplicar la migración de marketing' };
    }
    return { ok: false, error: error.message };
  }
  if (!data?.id) return { ok: false, error: 'No se pudo guardar' };

  revalidatePath('/ajustes/marketing');
  return { ok: true, id: data.id as string };
}

export async function deleteMarketingCreative(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireRole('admin');
  const sb = createClient();
  const { data, error } = await sb
    .from('marketing_creatives')
    .select('id, image_path')
    .eq('id', id)
    .eq('salon_id', me.salon_id)
    .maybeSingle();

  if (error || !data) return { ok: false, error: error?.message ?? 'No encontrada' };

  const path = (data as { image_path: string | null }).image_path;
  const { error: delErr } = await sb
    .from('marketing_creatives')
    .delete()
    .eq('id', id)
    .eq('salon_id', me.salon_id);
  if (delErr) return { ok: false, error: delErr.message };

  if (path) {
    await sb.storage.from('marketing-creatives').remove([path]);
  }
  revalidatePath('/ajustes/marketing');
  return { ok: true };
}
