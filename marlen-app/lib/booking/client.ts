import type {
  BookingCheckoutRedirect,
  BookingConfirm,
  BookingFail,
  BookingSlot,
} from '@/lib/booking/types';

async function readJson<T>(res: Response): Promise<T> {
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    throw new Error(`Respuesta no JSON (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function apiMonthDays(
  slug: string,
  serviceId: string,
  year: number,
  month: number,
  providerId?: string | null,
): Promise<{ ok: true; days: string[] } | BookingFail> {
  const q = new URLSearchParams({
    service: serviceId,
    year: String(year),
    month: String(month),
  });
  if (providerId) q.set('provider', providerId);
  const res = await fetch(`/api/booking/${encodeURIComponent(slug)}/month?${q}`, {
    cache: 'no-store',
  });
  return readJson(res);
}

export async function apiDaySlots(
  slug: string,
  serviceId: string,
  date: string,
  providerId?: string | null,
): Promise<{ ok: true; slots: BookingSlot[] } | BookingFail> {
  const q = new URLSearchParams({ service: serviceId, date });
  if (providerId) q.set('provider', providerId);
  const res = await fetch(`/api/booking/${encodeURIComponent(slug)}/slots?${q}`, {
    cache: 'no-store',
  });
  return readJson(res);
}

export async function apiSubmitBooking(input: {
  slug: string;
  serviceId: string;
  startsAt: string;
  providerId: string | null;
  fullName: string;
  phone: string;
  email?: string;
  note?: string;
  linkKey?: string | null;
  embed?: boolean;
}): Promise<
  | BookingConfirm
  | BookingCheckoutRedirect
  | (BookingFail & { message: string })
> {
  const res = await fetch(`/api/booking/${encodeURIComponent(input.slug)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceId: input.serviceId,
      startsAt: input.startsAt,
      providerId: input.providerId,
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
      note: input.note,
      linkKey: input.linkKey ?? null,
      embed: input.embed ?? false,
    }),
  });
  return readJson(res);
}
