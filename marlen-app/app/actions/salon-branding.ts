'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/require-session';
import { createClient } from '@/lib/supabase/server';
import { recordOpsAudit } from '@/lib/ops-support-audit';
import { salonBrandingFromRow, type SalonBranding } from '@/lib/salon-branding';

const SELECT = 'name, legal_name, tax_id, fiscal_address, phone, logo_path';

export async function loadSalonBranding(): Promise<SalonBranding> {
  const me = await requireRole('admin', 'reception');
  const sb = createClient();
  const { data, error } = await sb
    .from('salons')
    .select(SELECT)
    .eq('id', me.salon_id)
    .maybeSingle();

  if (error && /legal_name|tax_id|fiscal_address|logo_path/i.test(error.message)) {
    const retry = await sb.from('salons').select('name, phone').eq('id', me.salon_id).maybeSingle();
    return salonBrandingFromRow(retry.data ?? { name: '' });
  }

  return salonBrandingFromRow(data);
}

export async function saveSalonBranding(input: {
  name: string;
  legalName: string;
  taxId: string;
  fiscalAddress: string;
  phone: string;
}): Promise<{ ok: true; error: null } | { ok: false; error: string }> {
  const me = await requireRole('admin');
  const sb = createClient();

  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Pon un nombre para el centro' };

  const payload = {
    name,
    legal_name: input.legalName.trim() || null,
    tax_id: input.taxId.trim() || null,
    fiscal_address: input.fiscalAddress.trim() || null,
    phone: input.phone.trim() || null,
  };

  const { error } = await sb.from('salons').update(payload).eq('id', me.salon_id);
  if (error) {
    if (/legal_name|tax_id|fiscal_address|logo_path/i.test(error.message)) {
      return { ok: false, error: 'Falta aplicar la migración de datos del centro' };
    }
    return { ok: false, error: error.message };
  }

  void recordOpsAudit('salon.branding', { salonId: me.salon_id, name });
  revalidatePath('/ajustes/centro');
  revalidatePath('/ajustes');
  revalidatePath('/finanzas');
  return { ok: true, error: null };
}

export async function saveSalonLogoPath(
  logoPath: string | null,
): Promise<{ ok: true; error: null } | { ok: false; error: string }> {
  const me = await requireRole('admin');
  const sb = createClient();

  if (logoPath && !logoPath.startsWith(`${me.salon_id}/`)) {
    return { ok: false, error: 'Ruta de logo no válida' };
  }

  const { error } = await sb
    .from('salons')
    .update({ logo_path: logoPath })
    .eq('id', me.salon_id);

  if (error) {
    if (/logo_path/i.test(error.message)) {
      return { ok: false, error: 'Falta aplicar la migración de datos del centro' };
    }
    return { ok: false, error: error.message };
  }

  void recordOpsAudit('salon.logo', { salonId: me.salon_id, logoPath });
  revalidatePath('/ajustes/centro');
  revalidatePath('/finanzas');
  return { ok: true, error: null };
}
