import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  earAskSave, earSaved, forEar, parseVoice, saidDayOffset, splitWake, takeTime, wakeRestIsCommand, weekdayOffset,
} from '../lib/voice';
import { takeVoiceSlot } from '../lib/voice-limits';
import { DAY_END, DAY_START, nowMinutes } from '../lib/time';

test('menos cuarto en frase larga, mediodía, primera y última hora', () => {
  assert.equal(takeTime('cita para Lucía a las cinco menos cuarto').startMin, 16 * 60 + 45);
  assert.equal(takeTime('a mediodía').startMin, 12 * 60);
  assert.equal(takeTime('ponla a primera hora').startMin, DAY_START);
  assert.equal(takeTime('a última hora').startMin, DAY_END - 60);
});

test('dentro de una hora es ahora más una hora, en cuartos', () => {
  const t = takeTime('dentro de una hora').startMin!;
  const min = nowMinutes() + 60;
  assert.ok(t >= Math.min(min, DAY_END - 15) && t < min + 15 + 1, `${t} vs ${min}`);
  assert.equal(t % 15, 0);
  const half = takeTime('dentro de media hora').startMin!;
  assert.ok(half <= t);
});

test('esta tarde es franja, y esta mañana no es mañana', () => {
  const tarde = parseVoice('quién tiene hueco esta tarde');
  assert.equal(tarde.kind, 'slots');
  if (tarde.kind === 'slots') {
    assert.equal(tarde.part, 'tarde');
    assert.equal(tarde.dayOffset, 0);
  }
  const manana = parseVoice('hay hueco esta mañana');
  if (manana.kind === 'slots') {
    assert.equal(manana.part, 'manana');
    assert.equal(manana.dayOffset, 0);
  }
  const book = parseVoice('cita para Lucía esta tarde a las cinco');
  assert.equal(book.kind, 'book');
  if (book.kind === 'book') {
    assert.equal(book.who, 'lucia');
    assert.equal(book.dayOffset, 0);
    assert.equal(book.startMin, 17 * 60);
  }
});

test('la semana que viene', () => {
  const monday = saidDayOffset('la semana que viene')!;
  assert.ok(monday >= 1 && monday <= 7);
  const jueves = saidDayOffset('el jueves de la semana que viene')!;
  assert.equal(jueves, monday + 3);
  assert.ok(jueves >= weekdayOffset('jueves')!);
  const cmd = parseVoice('cita para Lucía el martes de la semana que viene a las diez');
  assert.equal(cmd.kind, 'book');
  if (cmd.kind === 'book') {
    assert.equal(cmd.dayOffset, monday + 1);
    assert.equal(cmd.who, 'lucia');
  }
  assert.equal(saidDayOffset('el jueves que viene'), weekdayOffset('jueves'));
});

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
