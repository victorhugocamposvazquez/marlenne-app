import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeReminderDueAt } from '../lib/sms/reminders';

test('day_before_at_hour: due = día anterior a las 21 Madrid', () => {
  // Cita martes 4 nov 2026 12:30 Madrid (CET = UTC+1) → 11:30 UTC
  const starts = new Date('2026-11-04T11:30:00.000Z');
  const due = computeReminderDueAt(starts, {
    reminder_mode: 'day_before_at_hour',
    reminder_hours_before: 24,
    reminder_send_hour: 21,
    timezone: 'Europe/Madrid',
  });
  // Lunes 3 nov 21:00 Madrid = 20:00 UTC
  assert.equal(due.toISOString(), '2026-11-03T20:00:00.000Z');
});

test('tras las 21, el due de mañana ya está vencido (catch-up)', () => {
  const starts = new Date('2026-11-03T11:30:00.000Z'); // martes 12:30 Madrid
  const due = computeReminderDueAt(starts, {
    reminder_mode: 'day_before_at_hour',
    reminder_hours_before: 24,
    reminder_send_hour: 21,
    timezone: 'Europe/Madrid',
  });
  // Ahora: lunes 2 nov 22:00 Madrid = 21:00 UTC
  const now = new Date('2026-11-02T21:00:00.000Z');
  assert.ok(due.getTime() <= now.getTime(), 'due debe estar vencido para flush inmediato');
  assert.ok(starts.getTime() > now.getTime(), 'la cita sigue en el futuro');
});
