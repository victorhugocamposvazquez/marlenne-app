import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IMAGE_FOCUS_CENTER, panImageFocus } from '../lib/marketing/image-focus';

test('arrastrar la foto a la derecha mueve el encuadre', () => {
  const next = panImageFocus(IMAGE_FOCUS_CENTER, 100, 0, 200, 400);
  assert.equal(next.x, 0);
  assert.equal(next.y, 50);
});

test('arrastrar hacia arriba enseña la parte de abajo y no pasa de 100', () => {
  const next = panImageFocus({ x: 80, y: 90 }, -40, -80, 200, 100);
  assert.equal(next.x, 100);
  assert.equal(next.y, 100);
});
