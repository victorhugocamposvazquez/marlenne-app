import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ctaPaint, sanitizeHex, zoneInk } from '../lib/marketing/zone-color';

test('sin color elegido, el titular de promo sigue el texto del acento', () => {
  const ink = zoneInk('promo', '#D000A8');
  assert.equal(ink.title, '#FFFFFF');
  assert.equal(ink.price, '#D000A8');
});

test('un color por zona sustituye solo esa zona', () => {
  const ink = zoneInk('soft', '#D000A8', { title: '#1A7F4E', eyebrow: 'no' });
  assert.equal(ink.title, '#1A7F4E');
  assert.notEqual(ink.eyebrow, 'no');
  assert.equal(ink.subtitle, '#4A4957');
});

test('el botón relleno usa el color de fondo y un texto que se lee', () => {
  const paint = ctaPaint('card', '#D000A8', '#F5C542');
  assert.equal(paint.background, '#F5C542');
  assert.equal(paint.color, '#0F0E1A');
});

test('el botón de contorno pinta borde y texto', () => {
  const paint = ctaPaint('luxe', '#D000A8', '#fff');
  assert.equal(paint.color, '#FFFFFF');
  assert.equal(paint.border, '3px solid #FFFFFF');
  assert.equal(paint.background, undefined);
});

test('sanitizeHex acepta corto y largo', () => {
  assert.equal(sanitizeHex('#abc'), '#AABBCC');
  assert.equal(sanitizeHex('rojo'), undefined);
});
