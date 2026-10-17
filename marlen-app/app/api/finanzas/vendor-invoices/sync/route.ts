import { NextResponse } from 'next/server';
import { syncAmazonInvoices } from '@/lib/amazon-business';
import { syncMetaInvoices } from '@/lib/meta-business-invoices';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireVendorInvoicesAccess } from '@/lib/vendor-invoices-access';
import type { VendorKind } from '@/lib/vendor-invoices';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const access = await requireVendorInvoicesAccess();
  if (!access.ok) return access.response;
  const { me } = access;

  const body = await req.json().catch(() => ({})) as {
    periodKey?: string;
    vendors?: string[];
  };
  const periodKey = body.periodKey?.trim();
  if (!periodKey || !/^\d{4}-T[1-4]$/.test(periodKey)) {
    return NextResponse.json({ error: 'periodKey inválido (ej. 2026-T3)' }, { status: 400 });
  }

  const raw = body.vendors ?? ['amazon_business', 'meta'];
  const vendors = raw.filter(
    (v): v is Exclude<VendorKind, 'manual'> => v === 'amazon_business' || v === 'meta',
  );
  if (!vendors.length) {
    return NextResponse.json({ error: 'Elige Amazon y/o Meta' }, { status: 400 });
  }

  const sb = createAdminClient();
  const results: Record<string, { imported: number; skipped: number } | { error: string }> = {};

  for (const v of vendors) {
    if (v === 'amazon_business') {
      const r = await syncAmazonInvoices(sb, me.salon_id, periodKey);
      results.amazon_business = r.ok
        ? { imported: r.imported, skipped: r.skipped }
        : { error: r.error };
    } else {
      const r = await syncMetaInvoices(sb, me.salon_id, periodKey);
      results.meta = r.ok
        ? { imported: r.imported, skipped: r.skipped }
        : { error: r.error };
    }
  }

  return NextResponse.json({ ok: true, results });
}
