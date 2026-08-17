export const DAY_START = 9 * 60;   // 09:00
export const DAY_END = 20 * 60;    // 20:00
export const TZ = 'Europe/Madrid';

export const fmt = (min: number) =>
  `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

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

export function dateFromOffset(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Combina un día y minutos-desde-medianoche en un instante UTC. */
export function toTimestamp(date: Date, startMin: number) {
  const d = new Date(date);
  d.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
  return d.toISOString();
}

export function dayTitle(offset: number) {
  if (offset === 0) return 'Hoy';
  if (offset === 1) return 'Mañana';
  const s = dateFromOffset(offset).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'short',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function dayName(offset: number) {
  if (offset === 0) return 'Hoy';
  if (offset === 1) return 'Mañana';
  return dateFromOffset(offset).toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
}
