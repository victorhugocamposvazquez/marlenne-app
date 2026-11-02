import { NextResponse } from 'next/server';
import { loadMonthDays } from '@/lib/booking/server';

export const dynamic = 'force-dynamic';

type Ctx = { params: { slug: string } };

export async function GET(req: Request, { params }: Ctx) {
  const slug = decodeURIComponent(params.slug).toLowerCase();
  const url = new URL(req.url);
  const serviceId = url.searchParams.get('service');
  const year = Number(url.searchParams.get('year'));
  const month = Number(url.searchParams.get('month'));
  const providerId = url.searchParams.get('provider');
  if (!serviceId || !year || !month) {
    return NextResponse.json({ ok: false, code: 'range' }, { status: 400 });
  }
  const r = await loadMonthDays(slug, serviceId, year, month, providerId);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
