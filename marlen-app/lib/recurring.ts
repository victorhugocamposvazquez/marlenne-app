import { addDays } from './time';

export const RECUR_WEEKS_MIN = 2;
export const RECUR_WEEKS_MAX = 16;
export const RECUR_WEEKS_DEFAULT = 4;

/** La primera fecha es la cita de ahora. El resto cae el mismo día, cada 7. */
export function recurringWeekDates(startDate: string, weeks: number): string[] {
  const count = Math.min(RECUR_WEEKS_MAX, Math.max(RECUR_WEEKS_MIN, Math.round(weeks)));
  return Array.from({ length: count }, (_, i) => addDays(startDate, i * 7));
}

/** `09:30` → minutos. No empuja la mañana a la tarde. */
export function clockToMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function minutesToClock(min: number): string {
  const hour = Math.floor(min / 60);
  const minute = min % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
