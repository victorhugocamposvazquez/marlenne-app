import assert from 'node:assert/strict';
import { test } from 'node:test';
import { voiceClipUrl } from '../lib/voice-clips';

test('clips fijos de Elvira', () => {
  assert.equal(voiceClipUrl('¿Dime?'), '/voice/dime.mp3');
  assert.equal(voiceClipUrl('Bien, aquí. ¿Una cita o un hueco?'), '/voice/bien-aqui.mp3');
  assert.equal(voiceClipUrl('Nueva cita.'), '/voice/nueva-cita.mp3');
  assert.equal(voiceClipUrl('Cita para Lucía a las once'), null);
  assert.equal(voiceClipUrl('¿La guardo para'), '/voice/la-guardo-para.mp3');
  assert.equal(voiceClipUrl('Guardo la cita para'), '/voice/guardo-cita-para.mp3');
  assert.equal(voiceClipUrl('a las'), '/voice/a-las.mp3');
  assert.equal(voiceClipUrl('¿Qué teléfono? Di «sin teléfono» si no lo tienes.'), '/voice/que-telefono.mp3');
  assert.equal(voiceClipUrl('¿El teléfono?'), '/voice/el-telefono.mp3');
});
