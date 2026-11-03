'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/require-session';
import { createClient } from '@/lib/supabase/server';
import { recordOpsAudit } from '@/lib/ops-support-audit';
import {
  BOOKING_DEFAULT_ACCENT,
  deriveAccentSoft,
  deriveBookingInk,
  normalizeBookingHex,
} from '@/lib/booking/theme';

export type BookingThemeSaved = {
  accent: string | null;
  accentSoft: string | null;
  ink: string | null;
};

export async function saveBookingTheme(input: {
  accent: string | null;
}): Promise<{ ok: true; theme: BookingThemeSaved } | { ok: false; error: string }> {
  const me = await requireRole('admin');
  const sb = createClient();

  let accent: string | null = null;
  let accentSoft: string | null = null;
  let ink: string | null = null;

  if (input.accent != null && input.accent.trim() !== '') {
    const hex = normalizeBookingHex(input.accent);
    if (!hex) return { ok: false, error: 'Color no válido (usa #RRGGBB)' };
    // Null en BD = default; si eligen el default explícito, guardamos null.
    if (hex !== BOOKING_DEFAULT_ACCENT) {
      accent = hex;
      accentSoft = deriveAccentSoft(hex);
      ink = deriveBookingInk(hex);
    }
  }

  const { error } = await sb
    .from('salons')
    .update({
      booking_accent: accent,
      booking_accent_soft: accentSoft,
      booking_ink: ink,
    })
    .eq('id', me.salon_id);

  if (error) {
    if (/booking_accent/i.test(error.message)) {
      return { ok: false, error: 'Falta aplicar la migración de colores del widget' };
    }
    return { ok: false, error: error.message };
  }

  void recordOpsAudit('salon.booking_theme', {
    salonId: me.salon_id,
    accent: accent ?? BOOKING_DEFAULT_ACCENT,
  });
  revalidatePath('/ajustes/widget-reservas');
  revalidatePath('/r', 'layout');
  revalidatePath('/embed', 'layout');

  return { ok: true, theme: { accent, accentSoft, ink } };
}
