import { NextResponse } from 'next/server';
import { getSession } from '@/lib/queries';
import { createClient } from '@/lib/supabase/server';
import { buildVendorInvoicesZip } from '@/lib/vendor-invoices-load';
import type { VendorKind } from '@/lib/vendor-invoices';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (me.role !== 'admin' && me.role !== 'reception') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const periodKey = url.searchParams.get('period')?.trim() || '';
  if (!/^\d{4}-T[1-4]$/.test(periodKey)) {
    return NextResponse.json({ error: 'period inválido' }, { status: 400 });
  }

  const vendorsParam = url.searchParams.get('vendors') || 'amazon_business,meta,manual';
  const vendors = vendorsParam
    .split(',')
    .map(s => s.trim())
    .filter((v): v is VendorKind =>
      v === 'amazon_business' || v === 'meta' || v === 'manual',
    );

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
