import { NextResponse } from 'next/server';
import { startPaidBookingCheckout } from '@/lib/booking/checkout';
import {
  bookingErrorMessage,
  createPublicBooking,
  loadBookingCatalog,
  loadBookingLink,
} from '@/lib/booking/server';

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
    linkKey?: string | null;
    embed?: boolean;
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

  const origin = new URL(req.url).origin;
  let paymentMode: 'free' | 'pay_full' | 'pay_deposit' = 'free';
  let link: import('@/lib/booking/types').BookingLink | null = null;

  if (body.linkKey) {
    const lr = await loadBookingLink(slug, body.linkKey);
    if (!lr.ok) {
      return NextResponse.json(
        { ...lr, message: bookingErrorMessage(lr.code) },
        { status: 400 },
      );
    }
    link = lr.link;
    paymentMode = lr.link.payment_mode;
    if (lr.link.service_id && lr.link.service_id !== body.serviceId) {
      return NextResponse.json(
        { ok: false, code: 'service', message: bookingErrorMessage('service') },
        { status: 400 },
      );
    }
  }

  if (paymentMode === 'free') {
    const r = await createPublicBooking({
      slug,
      serviceId: body.serviceId,
      startsAt: body.startsAt,
      providerId: body.providerId ?? link?.provider_id ?? null,
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

  if (!link) {
    return NextResponse.json(
      { ok: false, code: 'link', message: 'Este cobro requiere un enlace de reserva' },
      { status: 400 },
    );
  }

  const cat = await loadBookingCatalog(slug);
  if (!cat.ok) {
    return NextResponse.json(
      { ...cat, message: bookingErrorMessage(cat.code) },
      { status: 400 },
    );
  }
  const service = cat.services.find(s => s.id === body.serviceId);
  if (!service) {
    return NextResponse.json(
      { ok: false, code: 'service', message: bookingErrorMessage('service') },
      { status: 400 },
    );
  }

  const checkout = await startPaidBookingCheckout({
    slug,
    salonId: cat.salon.id,
    salonName: cat.salon.name,
    link,
    serviceId: service.id,
    serviceName: service.name,
    priceCents: service.price_cents,
    durationMin: service.duration_min,
    startsAt: body.startsAt,
    providerId: body.providerId ?? link.provider_id,
    fullName: body.fullName,
    phone: body.phone,
    email: body.email,
    note: body.note,
    origin,
    embed: !!body.embed,
  });

  if (!checkout.ok) {
    return NextResponse.json(
      {
        ...checkout,
        message: checkout.message ?? bookingErrorMessage(checkout.code),
      },
      { status: 400 },
    );
  }
  return NextResponse.json(checkout);
}
