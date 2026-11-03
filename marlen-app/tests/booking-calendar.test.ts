import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPriceCents,
  monthCells,
  shiftMonth,
  ymd,
} from '../lib/booking/calendar';
import {
  bookingPageUrl,
  bookingQuery,
  parseBookingPreset,
} from '../lib/booking/urls';

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

describe('booking deep links', () => {
  it('builds query for ads preset', () => {
    assert.equal(bookingQuery({}), '');
    assert.equal(
      bookingQuery({ serviceId: 'svc-1', providerId: 'pro-1' }),
      '?service=svc-1&provider=pro-1',
    );
    assert.equal(
      bookingPageUrl('https://app.example', 'arlett', { serviceId: 'svc-1' }),
      'https://app.example/r/arlett?service=svc-1',
    );
    assert.match(
      bookingQuery({ serviceId: 'svc-1', title: 'Reserva tu cavitación' }),
      /title=Reserva/,
    );
  });

  it('parses service/provider/title aliases', () => {
    assert.deepEqual(parseBookingPreset({ s: 'svc', con: 'cab', t: 'Oferta' }), {
      serviceId: 'svc',
      providerId: 'cab',
      title: 'Oferta',
    });
    assert.deepEqual(parseBookingPreset({ service: 'a', provider: 'b', title: '  Hola  ' }), {
      serviceId: 'a',
      providerId: 'b',
      title: 'Hola',
    });
  });
});
