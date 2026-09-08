import assert from 'node:assert/strict';
import { test } from 'node:test';
import { slotGaps, snapInGap } from '../lib/place-slots';

test('un tramo libre es un hueco, no cada cuarto', () => {
  assert.deepEqual(
    slotGaps([16 * 60, 16 * 60 + 15, 16 * 60 + 30, 16 * 60 + 45]),
    [{ first: 16 * 60, last: 16 * 60 + 45 }],
  );
});

test('dos agujeros se quedan separados', () => {
  assert.deepEqual(
    slotGaps([10 * 60, 10 * 60 + 15, 17 * 60, 17 * 60 + 15]),
    [
      { first: 10 * 60, last: 10 * 60 + 15 },
      { first: 17 * 60, last: 17 * 60 + 15 },
    ],
  );
});

test('lista vacía', () => {
  assert.deepEqual(slotGaps([]), []);
});

test('el toque se queda dentro del hueco', () => {
  const gap = { first: 16 * 60, last: 17 * 60 };
  assert.equal(snapInGap(16 * 60 + 10, gap), 16 * 60 + 15);
  assert.equal(snapInGap(16 * 60 + 40, gap), 16 * 60 + 45);
  assert.equal(snapInGap(10 * 60, gap), 16 * 60);
  assert.equal(snapInGap(20 * 60, gap), 17 * 60);
});
