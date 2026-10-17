import type { SupabaseClient } from '@supabase/supabase-js';
import { periodKeyFromDate, type VendorKind } from '@/lib/vendor-invoices';

export type StoreVendorPdfInput = {
  salonId: string;
  vendor: VendorKind;
  externalId: string;
  title: string;
  issuedAt: string; // YYYY-MM-DD
  amountCents?: number | null;
  source: 'upload' | 'amazon_api' | 'meta_api';
  pdf: Buffer;
  contentType?: string;
};

export async function storeVendorPdf(
  sb: SupabaseClient,
  input: StoreVendorPdfInput,
): Promise<{ ok: true; id: string; storagePath: string } | { ok: false; error: string }> {
  const periodKey = periodKeyFromDate(input.issuedAt);
  const safeExt = (input.externalId || 'file').replace(/[^\w.\-]+/g, '_').slice(0, 80);
  const storagePath = `${input.salonId}/${input.vendor}/${periodKey}/${safeExt}.pdf`;

  const { error: upErr } = await sb.storage.from('salon-vendor-invoices').upload(
    storagePath,
    input.pdf,
    { contentType: input.contentType ?? 'application/pdf', upsert: true },
  );
  if (upErr) {
    if (/Bucket not found|not found/i.test(upErr.message)) {
      return { ok: false, error: 'Falta aplicar la migración de facturas de proveedores' };
    }
    return { ok: false, error: upErr.message };
  }

  const row = {
    salon_id: input.salonId,
    vendor: input.vendor,
    external_id: input.externalId,
    title: input.title.slice(0, 200),
    issued_at: input.issuedAt,
    period_key: periodKey,
    amount_cents: input.amountCents ?? null,
    storage_path: storagePath,
    source: input.source,
  };

  const { data, error } = await sb
    .from('salon_vendor_invoices')
    .upsert(row, { onConflict: 'salon_id,vendor,external_id' })
    .select('id')
    .maybeSingle();

  if (error) {
    if (/salon_vendor_invoices|does not exist/i.test(error.message)) {
      return { ok: false, error: 'Falta aplicar la migración de facturas de proveedores' };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, id: (data?.id as string) ?? '', storagePath };
}
