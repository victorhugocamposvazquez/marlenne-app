import { catStyle } from '@/lib/categories';
import { DAY_END, DAY_START, fmt, minutesOfDay } from '@/lib/time';
import type { WeekDay } from '@/lib/types';

export const AFTERNOON_START = 15 * 60;
const GAP_STEP = 30;
const FLOJO_GAPS = 3;
const ALMOST_FULL = 85;

export type WeekAppt = WeekDay['appointments'][number];

export function activeAppts(appts: WeekAppt[]) {
  return appts.filter(a => a.status !== 'noshow');
}

export function isClosedDay(day: Pick<WeekDay, 'dow' | 'appointments'>) {
  return day.dow === 'D' && activeAppts(day.appointments).length === 0;
}

export function dayCapacityMin(providerCount: number) {
  return Math.max(1, providerCount) * (DAY_END - DAY_START);
}

export function bookedMin(appts: WeekAppt[]) {
  return activeAppts(appts).reduce((s, a) => s + a.duration_min, 0);
}

export function occPct(appts: WeekAppt[], providerCount: number) {
  return Math.round((100 * bookedMin(appts)) / dayCapacityMin(providerCount));
}

export function eurosOf(appts: WeekAppt[]) {
  return activeAppts(appts).reduce((s, a) => s + (a.price_cents ?? 0), 0) / 100;
}

export function eurosLbl(n: number) {
  const whole = String(Math.round(n));
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} €`;
}

export function afternoonGapCount(appts: WeekAppt[], step = GAP_STEP) {
  const busy = activeAppts(appts);
  let n = 0;
  for (let m = AFTERNOON_START; m < DAY_END; m += step) {
    const covered = busy.some(a => {
      const start = minutesOfDay(a.starts_at);
      return start < m + step && start + a.duration_min > m;
    });
    if (!covered) n++;
  }
  return n;
}

/** Si la tarde queda libre a partir de una hora (sin más citas). */
export function afternoonFreeFrom(appts: WeekAppt[]) {
  const busy = activeAppts(appts).filter(a => {
    const start = minutesOfDay(a.starts_at);
    return start + a.duration_min > AFTERNOON_START;
  });
  if (busy.length === 0) return AFTERNOON_START;
  const lastEnd = Math.max(...busy.map(a => minutesOfDay(a.starts_at) + a.duration_min));
  if (lastEnd <= AFTERNOON_START) return AFTERNOON_START;
  if (lastEnd < DAY_END - GAP_STEP) return lastEnd;
  return null;
}

export type DayTone = 'ok' | 'warn' | 'muted' | 'now' | 'plain';

export function dayLine(
  day: WeekDay,
  providerCount: number,
  nowMin?: number,
): { text: string; tone: DayTone } {
  if (isClosedDay(day)) return { text: 'Cerrado', tone: 'muted' };
  const n = activeAppts(day.appointments).length;
  const occ = occPct(day.appointments, providerCount);
  const citas = n === 1 ? '1 cita' : `${n} citas`;
  if (day.isToday && nowMin != null) {
    return { text: `${citas} · ${occ} % · ahora ${fmt(nowMin)}`, tone: 'now' };
  }
  if (occ >= ALMOST_FULL) {
    return { text: `${citas} · ${occ} % · casi lleno`, tone: 'ok' };
  }
  const freeFrom = afternoonFreeFrom(day.appointments);
  if (freeFrom != null && occ < 70) {
    return { text: `${citas} · ${occ} % · tarde libre desde ${fmt(freeFrom)}`, tone: 'warn' };
  }
  return { text: `${citas} · ${occ} % · ${eurosLbl(eurosOf(day.appointments))}`, tone: 'plain' };
}

export function weekTotals(days: WeekDay[], providerCount: number) {
  const open = days.filter(d => !isClosedDay(d));
  const appts = days.flatMap(d => d.appointments);
  const cap = dayCapacityMin(providerCount) * Math.max(1, open.length);
  return {
    citas: activeAppts(appts).length,
    occ: Math.round((100 * bookedMin(appts)) / cap),
    euros: eurosOf(appts),
  };
}

export function weekInsight(days: WeekDay[], nowOffset = 0) {
  let best: { day: WeekDay; gaps: number } | null = null;
  for (const day of days) {
    if (day.offset < nowOffset || isClosedDay(day)) continue;
    const gaps = afternoonGapCount(day.appointments);
    if (!best || gaps > best.gaps) best = { day, gaps };
  }
  if (!best || best.gaps < FLOJO_GAPS) return null;
  return {
    dayOffset: best.day.offset,
    text: `El ${best.day.name.toLowerCase()} va flojo: ${best.gaps} huecos de tarde`,
  };
}

export type TimelineBlock = { id: string; left: number; width: number; color: string };

export function timelineBlocks(appts: WeekAppt[]): TimelineBlock[] {
  const span = DAY_END - DAY_START;
  const out: TimelineBlock[] = [];
  for (const a of activeAppts(appts)) {
    const start = minutesOfDay(a.starts_at);
    const leftMin = Math.max(DAY_START, start);
    const rightMin = Math.min(DAY_END, start + a.duration_min);
    if (rightMin <= leftMin) continue;
    out.push({
      id: a.id,
      left: ((leftMin - DAY_START) / span) * 100,
      width: Math.max(1.2, ((rightMin - leftMin) / span) * 100),
      color: catStyle(a.category, { color: a.service_color }).color,
    });
  }
  return out;
}

export function nowMarkerPct(nowMin: number) {
  if (nowMin <= DAY_START) return 0;
  if (nowMin >= DAY_END) return 100;
  return ((nowMin - DAY_START) / (DAY_END - DAY_START)) * 100;
}

export function gapBand(appts: WeekAppt[]) {
  const from = afternoonFreeFrom(appts);
  if (from == null) return null;
  const span = DAY_END - DAY_START;
  return {
    left: ((from - DAY_START) / span) * 100,
    width: ((DAY_END - from) / span) * 100,
  };
}
