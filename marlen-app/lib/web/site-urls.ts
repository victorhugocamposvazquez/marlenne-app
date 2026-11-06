import { appOriginFromEnv } from '@/lib/app-origin';
import { RESERVED } from '@/lib/web/data';

export function publicSitePath(slug: string): string {
  return `/s/${slug}`;
}

/** URL pública que ya funciona (misma app). */
export function publicSiteUrl(slug: string, origin = appOriginFromEnv()): string {
  return `${origin.replace(/\/$/, '')}${publicSitePath(slug)}`;
}

/** Etiqueta vanity del handoff (DNS futuro). */
export function vanitySiteHost(slug: string): string {
  return `${slug}.marlenapp.com`;
}

export function normalizeSiteSlug(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
}

export function validateSiteSlug(slug: string): { ok: true } | { ok: false; error: string } {
  if (slug.length < 3) return { ok: false, error: 'Usa al menos 3 letras o números' };
  if (/^-|-$/.test(slug)) return { ok: false, error: 'No puede empezar ni acabar en guion' };
  if (!/^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?$/.test(slug)) {
    return { ok: false, error: 'Solo minúsculas, números y guiones' };
  }
  if (RESERVED.includes(slug)) {
    return { ok: false, error: `«${slug}» está reservado. Prueba con el nombre de tu centro` };
  }
  return { ok: true };
}

export function publicSiteMediaUrl(path: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !path) return null;
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/salon-sites/${path}`;
}

export function photoFromUrl(url: string, label: string | null = null, mine = true): { bg: string; label: string | null; mine?: boolean } {
  return { bg: `url("${url}") center / cover no-repeat`, label, mine };
}
