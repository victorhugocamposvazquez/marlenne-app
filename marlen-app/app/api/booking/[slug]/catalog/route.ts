import { NextResponse } from 'next/server';
import { loadBookingCatalog } from '@/lib/booking/server';

export const dynamic = 'force-dynamic';

type Ctx = { params: { slug: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const slug = decodeURIComponent(params.slug).toLowerCase();
  const r = await loadBookingCatalog(slug);
  return NextResponse.json(r, { status: r.ok ? 200 : 404 });
}
