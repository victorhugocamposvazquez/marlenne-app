import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  earAskSave, earSaved, forEar, isVoiceYes, parseBookLoose, parseVoice, saidDayOffset, saidService, splitWake, takeTime,
  wakeRestIsCommand, weekdayOffset,
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

test('sí, vale y pues sí confirman', () => {
  assert.equal(isVoiceYes('sí'), true);
  assert.equal(isVoiceYes('sí sí'), true);
  assert.equal(isVoiceYes('pues sí'), true);
  assert.equal(isVoiceYes('vale'), true);
  assert.equal(isVoiceYes('vacum'), false);
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
  const only = splitWake('Hola Marlén');
  assert.equal(only.woke, true);
  assert.equal(wakeRestIsCommand(only.rest), false);
  const named = splitWake('Hola Marlén Lucía');
  assert.equal(named.woke, true);
  assert.equal(wakeRestIsCommand(named.rest), true);
  const alias = splitWake('Hola Marlenne');
  assert.equal(alias.woke, true);
  const greet = splitWake('Hola Marlenne qué tal');
  assert.equal(greet.woke, true);
  assert.equal(wakeRestIsCommand(greet.rest), false);
  assert.equal(wakeRestIsCommand('quetal'), false);
  assert.equal(parseVoice('hola marlenne').kind, 'chat');
  assert.equal(parseVoice('hola marlenne que tal').kind, 'chat');
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

function bookOf(text: string) {
  const cmd = parseVoice(text);
  assert.equal(cmd.kind, 'book', text);
  return cmd.kind === 'book' ? cmd : null!;
}

test('cita: orden invertido, apellido y sin decir cita', () => {
  const a = bookOf('ponle vacum a Marta');
  assert.equal(a.who, 'marta');
  assert.match(a.serviceQ ?? '', /vacum/);

  const b = bookOf('hazme vacum a marta a las once');
  assert.equal(b.who, 'marta');
  assert.equal(b.startMin, 11 * 60);
  assert.match(b.serviceQ ?? '', /vacum/);

  const c = bookOf('apunta vacum para Marta Sanz a las 11:30');
  assert.equal(c.who, 'marta sanz');
  assert.match(c.serviceQ ?? '', /vacum/);

  const d = bookOf('cita para Marta Sanz vacum de media hora');
  assert.equal(d.who, 'marta sanz');
  assert.match(d.serviceQ ?? '', /vacum/);

  const loose = parseBookLoose('marta vacum de media hora');
  assert.ok(loose);
  assert.equal(loose?.who, 'marta');
  assert.match(loose?.serviceQ ?? '', /vacum/);

  assert.equal(saidService('vacum'), true);
  assert.equal(saidService('es corporal'), true);
  assert.equal(saidService('mejor vacum'), true);
  assert.equal(saidService('perez'), false);
});

test('quién puede mañana no toma el día por profesional', () => {
  const cmd = parseVoice('quién puede mañana a las once');
  assert.equal(cmd.kind, 'slots');
  if (cmd.kind === 'slots') {
    assert.equal(cmd.providerQ, null);
    assert.equal(cmd.startMin, 11 * 60);
    assert.equal(cmd.dayOffset, 1);
  }
});

test('hueco de media hora no toma «una» por profesional', () => {
  const cmd = parseVoice('quién tiene hueco de media hora esta tarde');
  assert.equal(cmd.kind, 'slots');
  if (cmd.kind === 'slots') {
    assert.equal(cmd.durationMin, 30);
    assert.equal(cmd.providerQ, null);
    assert.equal(cmd.part, 'tarde');
  }
  const hora = parseVoice('hay hueco de una hora mañana');
  assert.equal(hora.kind, 'slots');
  if (hora.kind === 'slots') {
    assert.equal(hora.durationMin, 60);
    assert.equal(hora.providerQ, null);
    assert.equal(hora.dayOffset, 1);
  }
});

test('frases de mostrador ya no son charla', () => {
  const hole = parseVoice('viene sin cita');
  assert.equal(hole.kind, 'slots');
  if (hole.kind === 'slots') assert.equal(hole.dayOffset, 0);

  const urgent = parseVoice('es urgente');
  assert.equal(urgent.kind, 'slots');

  const noshow = parseVoice('no va a venir');
  assert.equal(noshow.kind, 'status');
  if (noshow.kind === 'status') {
    assert.equal(noshow.status, 'noshow');
    assert.equal(noshow.who, null);
  }

  const named = parseVoice('Marta no va a venir');
  assert.equal(named.kind, 'status');
  if (named.kind === 'status') assert.equal(named.who, 'marta');

  const paso = parseVoice('la paso');
  assert.equal(paso.kind, 'status');
  if (paso.kind === 'status') assert.equal(paso.status, 'curso');

  const conf = parseVoice('llama para confirmar');
  assert.equal(conf.kind, 'find');

  const wait = parseVoice('está esperando');
  assert.equal(wait.kind, 'waiting');
  if (wait.kind === 'waiting') assert.equal(wait.who, null);

  const waitWho = parseVoice('Lucía está esperando');
  assert.equal(waitWho.kind, 'waiting');
  if (waitWho.kind === 'waiting') assert.equal(waitWho.who, 'lucia');

  const move = parseVoice('me he equivocado de hora');
  assert.equal(move.kind, 'move');

  assert.equal(parseVoice('ha llamado').kind, 'find');
  assert.equal(parseVoice('llaman por hueco').kind, 'slots');
  assert.equal(parseVoice('quién sigue').kind, 'today');
  assert.equal(parseVoice('lo de siempre').kind, 'same');
  const same = parseVoice('lo de siempre a Marta');
  assert.equal(same.kind, 'same');
  if (same.kind === 'same') assert.equal(same.who, 'marta');
  assert.equal(parseVoice('pues cancela').kind, 'cancel');
});

test('está apuntada y llega tarde no son charla', () => {
  const f = parseVoice('dice que está apuntada');
  assert.equal(f.kind, 'find');
  if (f.kind === 'find') assert.equal(f.who, null);

  const named = parseVoice('Lucía está apuntada');
  assert.equal(named.kind, 'find');
  if (named.kind === 'find') assert.equal(named.who, 'lucia');

  const late = parseVoice('llega tarde');
  assert.equal(late.kind, 'late');
  if (late.kind === 'late') assert.equal(late.who, null);

  const who = parseVoice('Marta llega tarde');
  assert.equal(who.kind, 'late');
  if (who.kind === 'late') assert.equal(who.who, 'marta');
});

test('cancela y mueve a medias no se pierden', () => {
  const c = parseVoice('cancela');
  assert.equal(c.kind, 'cancel');
  if (c.kind === 'cancel') assert.equal(c.who, null);

  const m = parseVoice('mueve a Lucía');
  assert.equal(m.kind, 'move');
  if (m.kind === 'move') {
    assert.equal(m.who, 'lucia');
    assert.equal(m.startMin, null);
  }

  const same = bookOf('cita para Marta lo de siempre');
  assert.equal(same.who, 'marta');
  assert.equal(same.serviceQ, 'same');
});
