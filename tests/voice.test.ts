import assert from 'node:assert/strict';
import { test } from 'node:test';
import { earAskSave, earSaved, forEar, parseVoice, splitWake, wakeRestIsCommand } from '../lib/voice';
import { takeVoiceSlot } from '../lib/voice-limits';

test('qué tal estás y dictado sucio son chat', () => {
  for (const text of ['qué tal estás', 'que tal eh estas', 'cómo estás', 'hola marlenne qué tal estás']) {
    const r = parseVoice(text);
    assert.equal(r.kind, 'chat', text);
  }
});

test('qué tal el día y qué hay hoy son el resumen', () => {
  assert.equal(parseVoice('qué tal el día').kind, 'today');
  assert.equal(parseVoice('qué hay hoy').kind, 'today');
});

test('creamos una cita abre el alta; con nombre, cita', () => {
  const open = parseVoice('creamos una cita');
  assert.equal(open.kind, 'go');
  if (open.kind === 'go') assert.match(open.href, /new=1/);
  const book = parseVoice('creamos una cita para Lucía a las 11:30');
  assert.equal(book.kind, 'book');
  if (book.kind === 'book') assert.equal(book.who, 'lucia');
});

test('splitWake y resto útil', () => {
  const only = splitWake('Hola Marlenne');
  assert.equal(only.woke, true);
  assert.equal(wakeRestIsCommand(only.rest), false);
  const named = splitWake('Hola Marlenne Lucía');
  assert.equal(named.woke, true);
  assert.equal(wakeRestIsCommand(named.rest), true);
});

test('forEar dice las horas', () => {
  assert.match(forEar('Cita a las 11:30'), /once y media/);
});

test('oído de cita no dice el nombre', () => {
  assert.match(earAskSave(1, 11 * 60), /mañana/);
  assert.match(earAskSave(1, 11 * 60), /once/);
  assert.doesNotMatch(earAskSave(1, 11 * 60), /Luc/i);
  assert.match(earSaved(1, 11 * 60), /Guardo la cita para/);
});

test('tope de ventana', () => {
  const key = `t-${Date.now()}`;
  assert.equal(takeVoiceSlot(key, 2, 60_000), true);
  assert.equal(takeVoiceSlot(key, 2, 60_000), true);
  assert.equal(takeVoiceSlot(key, 2, 60_000), false);
});
