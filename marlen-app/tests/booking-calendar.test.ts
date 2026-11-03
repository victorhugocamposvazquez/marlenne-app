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
  slugifyBooking,
} from '../lib/booking/urls';
import { resolveBookingServiceId } from '../lib/booking/resolve';

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
  it('builds friendly service path', () => {
    assert.equal(bookingQuery({}), '');
    assert.equal(
      bookingPageUrl('https://app.example', 'arlett', { serviceSlug: 'cavitacion' }),
      'https://app.example/r/arlett/cavitacion',
    );
    assert.equal(
      bookingPageUrl('https://app.example', 'arlett', {
        serviceSlug: 'cavitacion',
        providerSlug: 'cabina-1',
        title: 'Reserva ya',
      }),
      'https://app.example/r/arlett/cavitacion?con=cabina-1&title=Reserva+ya',
    );
  });

  it('slugify accents', () => {
    assert.equal(slugifyBooking('Cavitación'), 'cavitacion');
    assert.equal(slugifyBooking('D. Láser - 30 min'), 'd-laser-30-min');
  });

  it('parses service/provider/title aliases', () => {
    assert.deepEqual(parseBookingPreset({ con: 'cab', t: 'Oferta' }), {
      serviceId: null,
      serviceSlug: null,
      providerId: null,
      providerSlug: 'cab',
      title: 'Oferta',
    });
    assert.equal(
      resolveBookingServiceId(
        [{ id: '1', name: 'Cavitación', slug: 'cavitacion', category: '', duration_min: 30, price_cents: 0, color: null, sort_order: 0 }],
        'cavitacion',
      ),
      '1',
    );
  });
});
