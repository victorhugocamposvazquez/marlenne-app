import assert from 'node:assert/strict';
import { test } from 'node:test';
import { voiceClipUrl } from '../lib/voice-clips';

test('clips fijos de Elvira', () => {
  assert.equal(voiceClipUrl('¿Dime?'), '/voice/dime.mp3');
  assert.equal(voiceClipUrl('Bien, aquí. ¿Una cita o un hueco?'), '/voice/bien-aqui.mp3');
  assert.equal(voiceClipUrl('Nueva cita.'), '/voice/nueva-cita.mp3');
  assert.equal(voiceClipUrl('Cita para Lucía a las once'), null);
});
