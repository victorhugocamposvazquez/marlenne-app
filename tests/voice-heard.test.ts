import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanHeard } from '../lib/voice-heard';

test('frase normal pasa', () => {
  assert.equal(
    cleanHeard('cita para Lucía Pérez vacumterapia mañana a las once'),
    'cita para Lucía Pérez vacumterapia mañana a las once',
  );
  assert.equal(
    cleanHeard('sí', [{ no_speech_prob: 0.1 }]),
    'sí',
  );
});

test('frase fantasma se filtra', () => {
  assert.equal(cleanHeard('Subtítulos realizados por la comunidad de Amara.org'), '');
  assert.equal(cleanHeard('Gracias por ver el vídeo'), '');
  assert.equal(cleanHeard('Suscríbete'), '');
  assert.equal(cleanHeard('Hasta la próxima'), '');
  assert.equal(cleanHeard('Música'), '');
  assert.equal(cleanHeard('Aplausos'), '');
  assert.equal(cleanHeard('...'), '');
});

test('no_speech_prob alto se filtra', () => {
  assert.equal(
    cleanHeard('cita para Lucía', [{ no_speech_prob: 0.92 }, { no_speech_prob: 0.81 }]),
    '',
  );
  assert.equal(
    cleanHeard('cita para Lucía', [{ no_speech_prob: 0.9 }, { no_speech_prob: 0.2 }]),
    'cita para Lucía',
  );
});

test('cadena vacía devuelve vacío', () => {
  assert.equal(cleanHeard(''), '');
  assert.equal(cleanHeard('   '), '');
  assert.equal(cleanHeard('', [{ no_speech_prob: 0.1 }]), '');
});
