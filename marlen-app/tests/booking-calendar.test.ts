import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPriceCents,
  monthCells,
  shiftMonth,
  ymd,
} from '../lib/booking/calendar';

describe('booking calendar', () => {
  it('ymd pads month and day', () => {
    assert.equal(ymd(2026, 3, 5), '2026-03-05');
  });

  it('monthCells starts on Monday grid', () => {
    // 1 nov 2026 = domingo → offset 6
    const cells = monthCells(2026, 11);
    assert.equal(cells[6], 1);
    assert.equal(cells.filter(c => c != null).length, 30);
  });

  it('shiftMonth wraps year', () => {
    assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
    assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
  });

  it('formatPriceCents', () => {
    assert.equal(formatPriceCents(0), 'Gratis');
    assert.match(formatPriceCents(4500), /45/);
  });
});
