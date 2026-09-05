import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAY_START, isoWeekFromDayKey, toTimestamp } from '../lib/time';
import {
  AFTERNOON_START,
  afternoonFreeFrom,
  afternoonGapCount,
  dayLine,
  eurosLbl,
  occPct,
  timelineBlocks,
  weekInsight,
  weekTotals,
} from '../lib/week-view';
import type { WeekDay } from '../lib/types';

function appt(day: string, startMin: number, duration: number, extra: Partial<WeekDay['appointments'][number]> = {}) {
  return {
    id: `${day}-${startMin}`,
    starts_at: toTimestamp(day, startMin),
    duration_min: duration,
    category: 'corporal' as const,
    client_label: 'Lucía',
    service_name: 'Facial',
    provider_name: 'Valeria',
    status: 'prog' as const,
    service_color: '#EC4899',
    price_cents: 8000,
    ...extra,
  };
}

function day(partial: Partial<WeekDay> & Pick<WeekDay, 'offset' | 'dow' | 'name'>): WeekDay {
  return {
    num: 24,
    isToday: false,
    appointments: [],
    ...partial,
  };
}

test('iso week de finales de agosto 2026', () => {
  assert.equal(isoWeekFromDayKey('2026-08-24'), 35);
  assert.equal(isoWeekFromDayKey('2026-09-05'), 36);
});

test('ocupación y caja ignoran no-show', () => {
  const appts = [
    appt('2026-08-27', 10 * 60, 60),
    appt('2026-08-27', 12 * 60, 60, { status: 'noshow', price_cents: 9000 }),
  ];
  assert.equal(occPct(appts, 1), Math.round((100 * 60) / (20 * 60 - 9 * 60)));
});

test('huecos de tarde y libre desde', () => {
  const morning = [appt('2026-08-27', 9 * 60, 60), appt('2026-08-27', 11 * 60, 90)];
  assert.equal(afternoonFreeFrom(morning), AFTERNOON_START);
  assert.ok(afternoonGapCount(morning) >= 6);
  const till1630 = [appt('2026-08-27', 15 * 60, 90)];
  assert.equal(afternoonFreeFrom(till1630), 16 * 60 + 30);
});

test('bloques de la barra caben en 9–20', () => {
  const blocks = timelineBlocks([appt('2026-08-27', DAY_START, 60)]);
  assert.equal(blocks.length, 1);
  assert.ok(blocks[0].left >= 0);
  assert.ok(blocks[0].left + blocks[0].width <= 100.1);
});

test('totales e insight del día flojo', () => {
  const days: WeekDay[] = [
    day({ offset: 0, dow: 'L', name: 'Lunes', appointments: [appt('2026-08-24', 9 * 60, 120), appt('2026-08-24', 15 * 60, 180)] }),
    day({ offset: 3, dow: 'J', name: 'Jueves', appointments: [appt('2026-08-27', 10 * 60, 60)] }),
    day({ offset: 6, dow: 'D', name: 'Domingo' }),
  ];
  const totals = weekTotals(days, 1);
  assert.equal(totals.citas, 3);
  const insight = weekInsight(days, 0);
  assert.ok(insight);
  assert.equal(insight.dayOffset, 3);
  assert.match(insight.text, /jueves/);
  const closed = dayLine(days[2], 1);
  assert.equal(closed.text, 'Cerrado');
  assert.equal(eurosLbl(2140), '2.140 €');
});
