import assert from 'node:assert/strict';
import { test } from 'node:test';
import { waAppHref, waConfirmMsg, waHref, waIntl } from '../lib/phone';

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

test('plantilla del centro rellena los comodines', () => {
  const msg = waConfirmMsg({
    clientLabel: 'Ana López',
    service: 'Láser',
    startsAt: new Date().toISOString(),
    confirmUrl: 'https://app.marlenapp.com/c/abc',
  }, 'Hola {{cliente}}, {{servicio}}. {{enlace}}');
  assert.equal(msg, 'Hola Ana, Láser. https://app.marlenapp.com/c/abc');
});

test('sin enlace se quita el hueco', () => {
  const msg = waConfirmMsg({
    clientLabel: 'Ana López',
    service: 'Láser',
    startsAt: new Date().toISOString(),
  }, 'Hola {{cliente}} {{enlace}}');
  assert.equal(msg, 'Hola Ana');
});

test('sin comodín de enlace se añade al final', () => {
  const msg = waConfirmMsg({
    clientLabel: 'Ana López',
    service: 'Láser',
    startsAt: new Date().toISOString(),
    confirmUrl: 'https://app.marlenapp.com/c/abc',
  }, 'Hola {{cliente}}');
  assert.match(msg, /^Hola Ana\n\nConfirma aquí \(sí o no\): https:\/\/app\.marlenapp\.com\/c\/abc$/);
});
