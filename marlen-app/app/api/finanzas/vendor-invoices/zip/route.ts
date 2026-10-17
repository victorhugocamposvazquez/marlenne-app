import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireVendorInvoicesAccess } from '@/lib/vendor-invoices-access';
import { buildVendorInvoicesZip } from '@/lib/vendor-invoices-load';
import type { VendorKind } from '@/lib/vendor-invoices';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const access = await requireVendorInvoicesAccess();
  if (!access.ok) return access.response;
  const { me } = access;

  const url = new URL(req.url);
  const periodKey = url.searchParams.get('period')?.trim() || '';
  if (!/^\d{4}-T[1-4]$/.test(periodKey)) {
    return NextResponse.json({ error: 'period inválido' }, { status: 400 });
  }

  const vendorsParam = url.searchParams.get('vendors') || 'amazon_business,meta';
  const vendors = vendorsParam
    .split(',')
    .map(s => s.trim())
    .filter((v): v is VendorKind => v === 'amazon_business' || v === 'meta');

  const sb = createClient();
  const zip = await buildVendorInvoicesZip(sb, me.salon_id, periodKey, vendors);
  if (!zip.ok) {
    return NextResponse.json({ error: zip.error }, { status: 400 });
  }

  return new NextResponse(new Uint8Array(zip.buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zip.filename}"`,
      'X-Invoice-Count': String(zip.count),
    },
  });
}
