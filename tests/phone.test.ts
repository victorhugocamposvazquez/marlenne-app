import assert from 'node:assert/strict';
import { test } from 'node:test';
import { waAppHref, waHref, waIntl } from '../lib/phone';

test('9 cifras son España', () => {
  assert.equal(waIntl('666 12 34 56'), '34666123456');
  assert.equal(waIntl('+34 666123456'), '34666123456');
});

test('el enlace nativo lleva el texto para el iPhone con la PWA', () => {
  const app = waAppHref('666123456', 'Hola');
  assert.ok(app?.startsWith('whatsapp://send?phone=34666123456'));
  assert.ok(app?.includes('text=Hola'));
  assert.ok(waHref('666123456')?.startsWith('https://wa.me/34666123456'));
});
