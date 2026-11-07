import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanHeard, isPromptEcho, sttPrompt } from '../lib/voice-heard';

const vocab = sttPrompt(
  ['Láser', 'Manicura semipermanente', 'Limpieza facial', 'Vacumterapia'],
  ['Ana', 'Marta'],
);

test('prompt corto con pinta de frase, sin clientas', () => {
  assert.equal(
    vocab.prompt,
    'Cita mañana a las once con Ana o con Marta. Láser, Manicura semipermanente, Limpieza facial, Vacumterapia.',
  );
  assert.deepEqual(vocab.words, ['Ana', 'Marta', 'Láser', 'Manicura semipermanente', 'Limpieza facial', 'Vacumterapia']);
  const many = sttPrompt(Array.from({ length: 80 }, (_, i) => `Servicio número ${i}`), ['Ana']);
  assert.ok(many.prompt.length <= 420);
  assert.ok(many.prompt.endsWith('.'));
});

test('eco del prompt se filtra', () => {
  assert.equal(cleanHeard('Láser, Manicura semipermanente, Limpieza facial.', undefined, vocab), '');
  assert.equal(cleanHeard('Ana, Marta, láser', undefined, vocab), '');
  assert.equal(cleanHeard('Láser, manicura semipermanente, limpieza facial, vacumterapia', undefined, vocab), '');
  assert.ok(isPromptEcho('con Ana o con Marta. Láser, Manicura semipermanente', vocab));
});

test('frase real con palabras del vocabulario pasa', () => {
  assert.equal(
    cleanHeard('cita para Lucía mañana a las once con Ana, láser', undefined, vocab),
    'cita para Lucía mañana a las once con Ana, láser',
  );
  assert.equal(cleanHeard('láser', undefined, vocab), 'láser');
  assert.equal(cleanHeard('sí', undefined, vocab), 'sí');
  assert.equal(cleanHeard('cita mañana a las once', undefined, vocab), 'cita mañana a las once');
});

test('segmentos inventados se filtran', () => {
  assert.equal(
    cleanHeard('la la la la la la la la', [{ compression_ratio: 3.1, no_speech_prob: 0.2 }]),
    '',
  );
  assert.equal(
    cleanHeard('cita para Lucía', [{ avg_logprob: -1.4, no_speech_prob: 0.55 }]),
    '',
  );
  assert.equal(
    cleanHeard('cita para Lucía', [{ avg_logprob: -0.3, no_speech_prob: 0.55, compression_ratio: 1.1 }]),
    'cita para Lucía',
  );
});

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
