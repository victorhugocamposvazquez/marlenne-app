import { NextResponse } from 'next/server';
import { getSession } from '@/lib/queries';
import { createClient } from '@/lib/supabase/server';
import { salonHasVendorInvoices } from '@/lib/vendor-invoices-feature';

/** Sesión admin/recepción + feature Ops activa. */
export async function requireVendorInvoicesAccess(): Promise<
  | { ok: true; me: NonNullable<Awaited<ReturnType<typeof getSession>>> }
  | { ok: false; response: NextResponse }
> {
  const me = await getSession();
  if (!me) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (me.role !== 'admin' && me.role !== 'reception') {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  const sb = createClient();
  const on = await salonHasVendorInvoices(sb, me.salon_id);
  if (!on) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Esta función no está activa para tu centro' },
        { status: 403 },
      ),
    };
  }
  return { ok: true, me };
}
