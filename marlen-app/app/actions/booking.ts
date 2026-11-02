'use server';

import {
  bookingErrorMessage,
  createPublicBooking,
  loadDaySlots,
  loadMonthDays,
} from '@/lib/booking/server';
import type { BookingConfirm, BookingFail, BookingSlot } from '@/lib/booking/types';

export async function fetchBookingMonthDays(
  slug: string,
  serviceId: string,
  year: number,
  month: number,
  providerId?: string | null,
): Promise<{ ok: true; days: string[] } | BookingFail> {
  return loadMonthDays(slug, serviceId, year, month, providerId);
}

export async function fetchBookingDaySlots(
  slug: string,
  serviceId: string,
  date: string,
  providerId?: string | null,
): Promise<{ ok: true; slots: BookingSlot[] } | BookingFail> {
  return loadDaySlots(slug, serviceId, date, providerId);
}

export async function submitBooking(input: {
  slug: string;
  serviceId: string;
  startsAt: string;
  providerId: string | null;
  fullName: string;
  phone: string;
  email?: string;
  note?: string;
}): Promise<BookingConfirm | (BookingFail & { message: string })> {
  const r = await createPublicBooking(input);
  if (!r.ok) return { ...r, message: bookingErrorMessage(r.code) };
  return r;
}
