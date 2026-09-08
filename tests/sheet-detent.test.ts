import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextSheetHeight, rubberHeight, sheetDetents, snapSheetHeight } from '../lib/sheet-detent';

test('tres topes, el bajo no baja de 176', () => {
  const [peek, mid, tall] = sheetDetents(800);
  assert.equal(peek, 240);
  assert.equal(mid, 400);
  assert.equal(tall, 640);
  assert.ok(sheetDetents(200)[0] >= 176);
});

test('goma: fuera de rango frena', () => {
  assert.equal(rubberHeight(300, 200, 500), 300);
  assert.ok(rubberHeight(100, 200, 500) < 200);
  assert.ok(rubberHeight(100, 200, 500) > 100);
  assert.ok(rubberHeight(600, 200, 500) > 500);
  assert.ok(rubberHeight(600, 200, 500) < 600);
});

test('sin impulso, cae en el tope más cercano', () => {
  assert.equal(snapSheetHeight(230, [200, 400, 640], 0), 200);
  assert.equal(snapSheetHeight(410, [200, 400, 640], 0), 400);
});

test('impulso hacia abajo baja de tope', () => {
  assert.equal(snapSheetHeight(390, [200, 400, 640], 0.8), 200);
});

test('impulso hacia arriba sube de tope', () => {
  assert.equal(snapSheetHeight(410, [200, 400, 640], -0.8), 640);
});

test('toque en el asidero sube un tope, o vuelve al medio', () => {
  assert.equal(nextSheetHeight(200, [200, 400, 640]), 400);
  assert.equal(nextSheetHeight(400, [200, 400, 640]), 640);
  assert.equal(nextSheetHeight(640, [200, 400, 640]), 400);
});
