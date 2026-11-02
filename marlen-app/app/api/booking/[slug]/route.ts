import { NextResponse } from 'next/server';
import { bookingErrorMessage, createPublicBooking } from '@/lib/booking/server';

export const dynamic = 'force-dynamic';

type Ctx = { params: { slug: string } };

export async function POST(req: Request, { params }: Ctx) {
  const slug = decodeURIComponent(params.slug).toLowerCase();
  let body: {
    serviceId?: string;
    startsAt?: string;
    providerId?: string | null;
    fullName?: string;
    phone?: string;
    email?: string;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: 'body', message: 'JSON inválido' }, { status: 400 });
  }

  if (!body.serviceId || !body.startsAt || !body.fullName || !body.phone) {
    return NextResponse.json(
      { ok: false, code: 'body', message: 'Faltan datos de la reserva' },
      { status: 400 },
    );
  }

  const r = await createPublicBooking({
    slug,
    serviceId: body.serviceId,
    startsAt: body.startsAt,
    providerId: body.providerId ?? null,
    fullName: body.fullName,
    phone: body.phone,
    email: body.email,
    note: body.note,
  });

  if (!r.ok) {
    return NextResponse.json(
      { ...r, message: bookingErrorMessage(r.code) },
      { status: 400 },
    );
  }
  return NextResponse.json(r);
}
