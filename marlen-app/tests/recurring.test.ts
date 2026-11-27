import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clockToMinutes,
  minutesToClock,
  recurringWeekDates,
  RECUR_WEEKS_MAX,
  RECUR_WEEKS_MIN,
} from '../lib/recurring';

test('cada semana repite el mismo día, incluida la cita de ahora', () => {
  assert.deepEqual(
    recurringWeekDates('2026-11-03', 3),
    ['2026-11-03', '2026-11-10', '2026-11-17'],
  );
});

test('las semanas se quedan entre el mínimo y el máximo', () => {
  assert.equal(recurringWeekDates('2026-11-03', 1).length, RECUR_WEEKS_MIN);
  assert.equal(recurringWeekDates('2026-11-03', 40).length, RECUR_WEEKS_MAX);
});

test('la hora del campo se lee tal cual', () => {
  assert.equal(clockToMinutes('09:30'), 9 * 60 + 30);
  assert.equal(clockToMinutes('18:00'), 18 * 60);
  assert.equal(clockToMinutes('24:00'), null);
  assert.equal(minutesToClock(9 * 60 + 5), '09:05');
});
