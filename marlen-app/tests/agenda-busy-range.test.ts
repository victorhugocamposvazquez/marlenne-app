import assert from 'node:assert/strict';
import test from 'node:test';
import {
  agendaBusyInitialCount,
  agendaBusyInitialStart,
  agendaBusyStripCount,
  agendaBusyStripStart,
} from '@/lib/agenda-busy-range';

test('initial busy window is small around selected day', () => {
  assert.equal(agendaBusyInitialStart(0), -21);
  assert.equal(agendaBusyInitialCount(), 43);
});

test('strip busy window matches day strip scroll range', () => {
  assert.equal(agendaBusyStripStart(10, 8), 8 - 90);
  const count = agendaBusyStripCount(10, 8);
  assert.ok(count > 200);
  assert.ok(count < 300);
});
