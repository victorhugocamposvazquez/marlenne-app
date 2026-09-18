import assert from 'node:assert/strict';
import { test } from 'node:test';
import { weekMondayOffset, weekStripDays } from '../lib/time';

test('la tira de semana son 7 días de lunes a domingo', () => {
  const days = weekStripDays(3);
  assert.equal(days.length, 7);
  assert.equal(days[0].offset, weekMondayOffset(3));
  assert.equal(days[6].offset, weekMondayOffset(3) + 6);
  assert.ok(days.some(d => d.offset === 3));
  assert.equal(new Set(days.map(d => d.offset)).size, 7);
});

test('hoy se marca solo si cae en esa semana', () => {
  const thisWeek = weekStripDays(0);
  assert.equal(thisWeek.filter(d => d.isToday).length, 1);
  assert.equal(thisWeek.find(d => d.isToday)?.offset, 0);

  const far = weekStripDays(21);
  assert.equal(far.some(d => d.isToday), false);
});
