export const DAY_START = 9 * 60;   // 09:00
export const DAY_END = 20 * 60;    // 20:00
export const TZ = 'Europe/Madrid';

export const fmt = (min: number) =>
  `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

/** Fecha corta en la zona del centro: "17 ago 2026". */
export const dateLbl = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', {
    timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric',
  });

export const durLbl = (min: number) =>
  min >= 60 ? (min % 60 ? `${Math.floor(min / 60)} h ${min % 60} m` : `${Math.floor(min / 60)} h`) : `${min} min`;

export function minutesOfDay(iso: string) {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('es-ES', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const h = Number(parts.find(p => p.type === 'hour')?.value ?? 0);
  const m = Number(parts.find(p => p.type === 'minute')?.value ?? 0);
  return h * 60 + m;
}

/** Instantáneo civil del centro. En Vercel Date() va en UTC y mentiría. */
export function madridNow() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const at = (t: string) => Number(parts.find(p => p.type === t)?.value ?? 0);
  return { y: at('year'), m: at('month'), d: at('day'), h: at('hour') % 24, min: at('minute') };
}

export function nowMinutes() {
  const { h, min } = madridNow();
  return h * 60 + min;
}

export function dateFromOffset(offset: number) {
  const { y, m, d } = madridNow();
  return new Date(Date.UTC(y, m - 1, d + offset));
}

/**
 * Día civil del centro (Europe/Madrid) en formato YYYY-MM-DD. Acepta un
 * 'YYYY-MM-DD' ya resuelto, un ISO completo o un Date: un ISO en UTC cae en el
 * día anterior si se recorta a pelo, así que siempre se pasa por la zona.
 */
export function dayKey(date: Date | string) {
  if (typeof date === 'string' && date.length <= 10) return date;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(typeof date === 'string' ? new Date(date) : date);
}

/** Desplazamiento de Madrid respecto a UTC, en ms, para un instante dado. */
function tzOffsetMs(utcMs: number) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date(utcMs));
  const at = (t: string) => Number(parts.find(p => p.type === t)?.value ?? 0);
  return Date.UTC(at('year'), at('month') - 1, at('day'), at('hour') % 24, at('minute'), at('second')) - utcMs;
}

/**
 * Combina un día y minutos-desde-medianoche en un instante UTC, leyendo siempre
 * la hora como hora del centro. No usar setHours: en Vercel el proceso va en UTC
 * y las citas se guardarían con el desfase de Madrid.
 */
export function toTimestamp(date: Date | string, startMin: number) {
  const [y, m, d] = dayKey(date).split('-').map(Number);
  const naive = Date.UTC(y, m - 1, d, Math.floor(startMin / 60), startMin % 60);
  return new Date(naive - tzOffsetMs(naive)).toISOString();
}

export function dayTitle(offset: number) {
  if (offset === 0) return 'Hoy';
  if (offset === 1) return 'Mañana';
  const s = dateFromOffset(offset).toLocaleDateString('es-ES', {
    timeZone: TZ, weekday: 'long', day: 'numeric', month: 'short',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function dayName(offset: number) {
  if (offset === 0) return 'Hoy';
  if (offset === 1) return 'Mañana';
  return dateFromOffset(offset).toLocaleDateString('es-ES', {
    timeZone: TZ, weekday: 'short',
  }).replace('.', '');
}

/** Desplazamiento de un ISO respecto a hoy civil del centro, para abrir la agenda en ese día. */
export function offsetFromDay(iso: string) {
  const [ty, tm, td] = dayKey(iso).split('-').map(Number);
  const { y, m, d } = madridNow();
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(y, m - 1, d)) / 86_400_000);
}

/** Lunes de la semana que contiene ese offset (0 = hoy). */
export function weekMondayOffset(dayOffset: number) {
  const dow = (dateFromOffset(dayOffset).getUTCDay() + 6) % 7;
  return dayOffset - dow;
}

/** «Esta semana» o «17 ago – 23 ago». */
export function weekTitle(dayOffset: number) {
  const mon = weekMondayOffset(dayOffset);
  if (mon === weekMondayOffset(0)) return 'Esta semana';
  const fmtDay = (off: number) => dateFromOffset(off).toLocaleDateString('es-ES', {
    timeZone: TZ, day: 'numeric', month: 'short',
  });
  return `${fmtDay(mon)} – ${fmtDay(mon + 6)}`;
}
/** «Hoy 11:30», «Mañana 9:00», «17 ago 16:00». */
export function shortWhen(iso: string) {
  const off = offsetFromDay(iso);
  const clock = fmt(minutesOfDay(iso));
  if (off === 0) return `Hoy ${clock}`;
  if (off === 1) return `Mañana ${clock}`;
  if (off === -1) return `Ayer ${clock}`;
  const day = dateLbl(iso).replace(/ \d{4}$/, '');
  return `${day} ${clock}`;
}
