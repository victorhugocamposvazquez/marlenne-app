import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dialogOpen, looksIncomplete, settleMs } from '../lib/voice-listen';

test('una frase a medias espera más que un sí', () => {
  assert.equal(settleMs('sí'), 1000);
  assert.equal(settleMs('vacum'), 1000);
  assert.equal(settleMs('hola marlén', 'wake'), 650);
  assert.ok(settleMs('cita para Lucía Pérez vacum') > settleMs('sí'));
  assert.ok(looksIncomplete('cita para'));
  assert.ok(looksIncomplete('a las'));
  assert.ok(looksIncomplete('mejor'));
  assert.equal(looksIncomplete('a las once'), false);
  assert.equal(settleMs('cita para'), 4200);
  assert.equal(settleMs('ponle vacum a Marta Sanz esta tarde a las once y media'), 4200);
});

test('diálogo abierto: no volver al oído de Hola', () => {
  assert.equal(dialogOpen({ pending: null, confirm: null, hold: null }), false);
  assert.equal(dialogOpen({ pending: { need: 'service' }, confirm: null, hold: null }), true);
  assert.equal(dialogOpen({ pending: null, confirm: { say: '¿La guardo?' }, hold: null }), true);
  assert.equal(dialogOpen({ pending: null, confirm: null, hold: { kind: 'cancel-who' } }), true);
});
