import { NextResponse } from 'next/server';
import { loadDaySlots } from '@/lib/booking/server';

export const dynamic = 'force-dynamic';

type Ctx = { params: { slug: string } };

export async function GET(req: Request, { params }: Ctx) {
  const slug = decodeURIComponent(params.slug).toLowerCase();
  const url = new URL(req.url);
  const serviceId = url.searchParams.get('service');
  const date = url.searchParams.get('date');
  const providerId = url.searchParams.get('provider');
  if (!serviceId || !date) {
    return NextResponse.json({ ok: false, code: 'range' }, { status: 400 });
  }
  const r = await loadDaySlots(slug, serviceId, date, providerId);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
