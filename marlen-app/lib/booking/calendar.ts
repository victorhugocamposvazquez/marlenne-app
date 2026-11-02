/** Rejilla de mes y formateo del booking. Sin DOM. */

const WEEKDAYS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'] as const;

export function weekdayLabels() {
  return WEEKDAYS;
}

/** Celdas del mes: null = hueco vacío antes/después. Día = 1..31. */
export function monthCells(year: number, month: number): (number | null)[] {
  // month 1-12. Lunes = primer día de la semana.
  const first = new Date(Date.UTC(year, month - 1, 1));
  const jsDow = first.getUTCDay(); // 0=dom
  const offset = jsDow === 0 ? 6 : jsDow - 1;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function monthTitle(year: number, month: number) {
  const raw = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('es-ES', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function ymd(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export function formatPriceCents(cents: number) {
  if (cents <= 0) return 'Gratis';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatBookingWhen(iso: string, timeZone = 'Europe/Madrid') {
  const d = new Date(iso);
  const date = d.toLocaleDateString('es-ES', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('es-ES', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return { date: date.charAt(0).toUpperCase() + date.slice(1), time };
}
