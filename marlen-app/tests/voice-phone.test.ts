import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsePhone } from '../lib/voice-phone';

test('dígitos, letras y sin teléfono', () => {
  assert.deepEqual(parsePhone('612 34 56 78'), { kind: 'ok', digits: '612345678' });
  assert.deepEqual(parsePhone('seis uno dos tres cuatro cinco seis siete ocho'), { kind: 'ok', digits: '612345678' });
  assert.deepEqual(parsePhone('sin teléfono'), { kind: 'skip' });
  assert.deepEqual(parsePhone('no tiene móvil'), { kind: 'skip' });
  assert.equal(parsePhone('hola').kind, 'bad');
  assert.equal(parsePhone('123').kind, 'bad');
});
