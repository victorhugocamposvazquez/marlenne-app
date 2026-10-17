import type { SupabaseClient } from '@supabase/supabase-js';
import JSZip from 'jszip';
import {
  periodRange,
  type VendorConnection,
  type VendorInvoice,
  type VendorKind,
} from '@/lib/vendor-invoices';

export async function loadVendorConnections(
  sb: SupabaseClient,
  salonId: string,
): Promise<VendorConnection[]> {
  const { data, error } = await sb
    .from('salon_vendor_connections')
    .select('vendor, status, external_account_id, connected_at, last_error')
    .eq('salon_id', salonId);
  if (error) {
    if (/salon_vendor_connections|does not exist|schema cache/i.test(error.message)) {
      return [
        { vendor: 'amazon_business', status: 'disconnected', externalAccountId: null, connectedAt: null, lastError: null },
        { vendor: 'meta', status: 'disconnected', externalAccountId: null, connectedAt: null, lastError: null },
      ];
    }
    throw new Error(error.message);
  }
  const byVendor = new Map(
    (data ?? []).map(r => [r.vendor as string, r]),
  );
  return (['amazon_business', 'meta'] as const).map(vendor => {
    const row = byVendor.get(vendor);
    return {
      vendor,
      status: (row?.status as VendorConnection['status']) ?? 'disconnected',
      externalAccountId: (row?.external_account_id as string | null) ?? null,
      connectedAt: (row?.connected_at as string | null) ?? null,
      lastError: (row?.last_error as string | null) ?? null,
    };
  });
}

export async function loadVendorInvoices(
  sb: SupabaseClient,
  salonId: string,
  periodKey: string,
): Promise<VendorInvoice[]> {
  const { data, error } = await sb
    .from('salon_vendor_invoices')
    .select('id, vendor, external_id, title, issued_at, period_key, amount_cents, storage_path, source')
    .eq('salon_id', salonId)
    .eq('period_key', periodKey)
    .order('issued_at', { ascending: false });
  if (error) {
    if (/salon_vendor_invoices|does not exist|schema cache/i.test(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(r => ({
    id: r.id as string,
    vendor: r.vendor as VendorKind,
    externalId: (r.external_id as string | null) ?? null,
    title: r.title as string,
    issuedAt: r.issued_at as string,
    periodKey: r.period_key as string,
    amountCents: (r.amount_cents as number | null) ?? null,
    storagePath: r.storage_path as string,
    source: r.source as VendorInvoice['source'],
  }));
}

export async function loadGestoriaContacts(
  sb: SupabaseClient,
  salonId: string,
): Promise<{ whatsapp: string | null }> {
  const { data, error } = await sb
    .from('salons')
    .select('gestoria_whatsapp')
    .eq('id', salonId)
    .maybeSingle();
  if (error) {
    return { whatsapp: null };
  }
  return {
    whatsapp: (data?.gestoria_whatsapp as string | null) ?? null,
  };
}

export async function buildVendorInvoicesZip(
  sb: SupabaseClient,
  salonId: string,
  periodKey: string,
  vendors: VendorKind[],
): Promise<{ ok: true; buffer: Buffer; filename: string; count: number } | { ok: false; error: string }> {
  let q = sb
    .from('salon_vendor_invoices')
    .select('title, storage_path, vendor, issued_at')
    .eq('salon_id', salonId)
    .eq('period_key', periodKey)
    .order('issued_at', { ascending: true });
  if (vendors.length) q = q.in('vendor', vendors);

  const { data, error } = await q;
  if (error) {
    if (/salon_vendor_invoices|does not exist/i.test(error.message)) {
      return { ok: false, error: 'Falta aplicar la migración de facturas de proveedores' };
    }
    return { ok: false, error: error.message };
  }
  const rows = data ?? [];
  if (!rows.length) return { ok: false, error: 'No hay facturas en este trimestre' };

  const zip = new JSZip();
  let added = 0;
  for (const row of rows) {
    const path = row.storage_path as string;
    const { data: blob, error: dlErr } = await sb.storage.from('salon-vendor-invoices').download(path);
    if (dlErr || !blob) continue;
    const buf = Buffer.from(await blob.arrayBuffer());
    const vendor = String(row.vendor);
    const base = String(row.title).replace(/[^\w.\- áéíóúñüÁÉÍÓÚÑÜ]+/gi, '_').slice(0, 80);
    const name = `${vendor}/${row.issued_at}_${base}.pdf`;
    zip.file(name, buf);
    added += 1;
  }
  if (!added) return { ok: false, error: 'No se han podido leer los PDF del almacén' };

  const buffer = Buffer.from(await zip.generateAsync({ type: 'uint8array' }));
  const { label } = periodRange(periodKey);
  const filename = `facturas-${periodKey.replace('-', '')}-${label.replace(/\s+/g, '')}.zip`;
  return { ok: true, buffer, filename, count: added };
}
