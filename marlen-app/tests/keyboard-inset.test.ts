import assert from 'node:assert/strict';
import test from 'node:test';
import { keyboardBox } from '../lib/keyboard-inset';

test('sin teclado la página sigue a altura completa', () => {
  assert.deepEqual(keyboardBox(800, 800, 0, false), { inset: 0, top: 0 });
  assert.deepEqual(keyboardBox(800, 500, 0, false), { inset: 0, top: 0 });
});

test('en iPhone el teclado es el hueco que no se ve', () => {
  assert.deepEqual(keyboardBox(800, 480, 0, true), { inset: 320, top: 0 });
});

test('si Safari desplaza la página, el hueco de arriba no cuenta como teclado', () => {
  assert.deepEqual(keyboardBox(800, 450, 40, true), { inset: 310, top: 40 });
});

test('Android ya encogido no se resta dos veces', () => {
  assert.deepEqual(keyboardBox(480, 480, 0, true), { inset: 0, top: 0 });
});

test('un salto pequeño de la barra no cuenta como teclado', () => {
  assert.deepEqual(keyboardBox(800, 750, 0, true), { inset: 0, top: 0 });
});
