import { NextResponse } from 'next/server';
import { getSession } from '@/lib/queries';
import { createClient } from '@/lib/supabase/server';
import { storeVendorPdf } from '@/lib/vendor-invoices-store';
import { periodKeyFromDate, type VendorKind } from '@/lib/vendor-invoices';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (me.role !== 'admin' && me.role !== 'reception') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Formulario inválido' }, { status: 400 });

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el PDF' }, { status: 400 });
  }
  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json({ error: 'PDF demasiado grande (máx. 12 MB)' }, { status: 400 });
  }

  const vendorRaw = String(form.get('vendor') || 'manual');
  const vendor: VendorKind =
    vendorRaw === 'amazon_business' || vendorRaw === 'meta' ? vendorRaw : 'manual';

  const issuedAtRaw = String(form.get('issuedAt') || '').trim();
  const issuedAt = /^\d{4}-\d{2}-\d{2}$/.test(issuedAtRaw)
    ? issuedAtRaw
    : new Date().toISOString().slice(0, 10);

  const title = String(form.get('title') || file.name || 'Factura').slice(0, 200);
  const pdf = Buffer.from(await file.arrayBuffer());
  const externalId = `upload-${randomUUID()}`;

  const sb = createClient();
  const stored = await storeVendorPdf(sb, {
    salonId: me.salon_id,
    vendor,
    externalId,
    title,
    issuedAt,
    source: 'upload',
    pdf,
    contentType: file.type || 'application/pdf',
  });

  if (!stored.ok) {
    return NextResponse.json({ error: stored.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    id: stored.id,
    periodKey: periodKeyFromDate(issuedAt),
    storagePath: stored.storagePath,
  });
}
