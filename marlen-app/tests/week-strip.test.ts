import assert from 'node:assert/strict';
import { test } from 'node:test';
import { alignStripStart, dayStripWindow, skipSunday, weekMondayOffset, weekStripDays } from '../lib/time';

test('la tira de semana son 7 días de lunes a domingo', () => {
  const days = weekStripDays(3);
  assert.equal(days.length, 7);
  assert.equal(days[0].offset, weekMondayOffset(3));
  assert.equal(days[6].offset, weekMondayOffset(3) + 6);
  assert.ok(days.some(d => d.offset === 3));
  assert.equal(new Set(days.map(d => d.offset)).size, 7);
});

test('la tira de agenda son 5 días seguidos', () => {
  const days = dayStripWindow(2, 5);
  assert.equal(days.length, 5);
  assert.equal(days[0].offset, 2);
  assert.equal(days[4].offset, 6);
});

test('si el día sale de la tira, la ventana empieza en ese día', () => {
  assert.equal(alignStripStart(12, 0, 5), 12);
  assert.equal(alignStripStart(3, 0, 5), 0);
});

test('el domingo no se elige: salta al siguiente o al anterior', () => {
  const sunday = dayStripWindow(-7, 14).find(d => d.isSunday);
  assert.ok(sunday);
  assert.notEqual(skipSunday(sunday.offset, 1), sunday.offset);
});

test('hoy se marca solo si cae en esa semana', () => {
  const thisWeek = weekStripDays(0);
  assert.equal(thisWeek.filter(d => d.isToday).length, 1);
  assert.equal(thisWeek.find(d => d.isToday)?.offset, 0);

  const far = weekStripDays(21);
  assert.equal(far.some(d => d.isToday), false);
});
