/** Validación de booking_slug (sin 'use server'). */

import { slugifyBooking } from '@/lib/booking/urls';

const RESERVED = new Set([
  'app', 'www', 'api', 'admin', 'mail', 'blog', 'help', 'ayuda', 'status',
  'r', 'cdn', 'static', 'sites', 'marlen', 'marlenapp', 'soporte', 'login',
  'pago', 'pagos', 's', 'panel', 'embed', 'ops', 'auth', 'ajustes',
]);

const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$/;

export function isReservedBookingSlug(slug: string): boolean {
  return RESERVED.has(slug);
}

export function normalizeBookingSlug(raw: string): string {
  return slugifyBooking(raw).slice(0, 64);
}

export function validateBookingSlug(slug: string): { ok: true } | { ok: false; error: string } {
  if (slug.length < 2) return { ok: false, error: 'Mínimo 2 caracteres' };
  if (slug.length > 64) return { ok: false, error: 'Máximo 64 caracteres' };
  if (!SLUG_RE.test(slug)) {
    return { ok: false, error: 'Solo minúsculas, números y guiones (sin empezar ni acabar en guion)' };
  }
  if (RESERVED.has(slug)) {
    return { ok: false, error: 'Ese nombre está reservado. Prueba otro.' };
  }
  return { ok: true };
}
