import type { BookingFail } from '@/lib/booking/types';

export function FAIL(code: string, message?: string): BookingFail {
  return { ok: false, code, message };
}
