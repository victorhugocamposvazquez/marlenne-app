import assert from 'node:assert/strict';
import { test } from 'node:test';
import { INITIAL, step, type Call, type DialogState, type Effect } from '../lib/voice-dialog';
import { NEW_CLIENT_CHIP, resolveClient } from '../lib/voice-clients';
import type { VoiceTalkResult } from '../lib/voice-types';

/**
 * Servidor falso: responde a cada llamada como lo haría voicePreviewBook & cía.
 * La conversación se conduce con `say`/`tap`/`yes` y se mira qué habla y qué llama.
 */
type Fake = (call: Call) => unknown;

class Convo {
  state: DialogState = INITIAL;
  spoken: string[] = [];
  calls: Call[] = [];
  last: Effect[] = [];
  closed = false;
  dismissed = false;
  navigated: string[] = [];
  reports: string[] = [];

  constructor(private server: Fake) {}

  private run(effects: Effect[]) {
    this.last = effects;
    for (const fx of effects) {
      if (fx.kind === 'speak') {
        this.spoken.push(fx.text);
        if (fx.then === 'close') this.closed = true;
      }
      if (fx.kind === 'navigate') this.navigated.push(fx.href);
      if (fx.kind === 'dismiss') this.dismissed = true;
      if (fx.kind === 'report') this.reports.push(fx.outcome);
      if (fx.kind === 'call') {
        this.calls.push(fx.call);
        const result = this.server(fx.call);
        const r = step(this.state, { kind: 'server', call: fx.call, result });
        this.state = r.state;
        this.run(r.effects);
      }
    }
  }

  say(text: string) {
    const r = step(this.state, { kind: 'heard', text });
    this.state = r.state;
    this.run(r.effects);
    return this;
  }

  tap(option: string) {
    const r = step(this.state, { kind: 'tap', option });
    this.state = r.state;
    this.run(r.effects);
    return this;
  }

  yes() {
    const r = step(this.state, { kind: 'yes' });
    this.state = r.state;
    this.run(r.effects);
    return this;
  }

  get lastSaid() { return this.spoken[this.spoken.length - 1]; }
  get lastCall() { return this.calls[this.calls.length - 1]; }
  panel() {
    const p = this.last.find(f => f.kind === 'panel');
    return p && p.kind === 'panel' ? p.panel : null;
  }
}

const LUCIAS = ['Lucía Pérez', 'Lucía Gómez'];
const VACUMS = ['Vacum 30 min', 'Vacum 60 min'];
const DRAFT = { serviceId: 's1', providerId: 'p1', date: '2026-09-04', startMin: 660, durationMin: 60, priceCents: 4000 };

/** Un voicePreviewBook de juguete que sigue la misma cadena: clienta → servicio → hora → ¿la guardo? */
const CLIENTS = [
  { id: 'c1', full_name: 'Lucía Pérez' }, { id: 'c2', full_name: 'Lucía Gómez' }, { id: 'c3', full_name: 'Marta Sanz' },
];

function fakeBook(call: Extract<Call, { action: 'previewBook' }>): VoiceTalkResult {
  const [saidWho, startMin, serviceQ, dayOffset, providerQ, ctx] = call.args;
  const newClient = ctx?.newClient ?? false;
  const phone = ctx?.phone;
  const within = ctx?.prevNeed === 'client' && ctx.choices?.length
    ? CLIENTS.filter(c => ctx.choices!.includes(c.full_name))
    : null;
  const res = newClient ? { kind: 'none' as const } : resolveClient(CLIENTS, saidWho, within);
  const base = { who: saidWho, startMin, dayOffset, providerQ, serviceQ };
  if (res.kind === 'several') {
    const names = res.options.map(c => c.full_name);
    return {
      ok: true, need: 'client', say: `¿${names.join(' o ')}?`, ear: 'Hay varias. ¿Cuál es?',
      options: names, pending: { ...base, need: 'client', choices: names, asks: 1 },
    };
  }
  if (res.kind !== 'one' && !newClient) {
    return {
      ok: true, need: 'client', say: `${saidWho} no está en fichas. ¿La doy de alta?`, ear: 'No está en fichas. ¿La doy de alta?',
      options: [NEW_CLIENT_CHIP], pending: { ...base, need: 'client', asks: 1 },
    };
  }
  if (newClient && phone === undefined) {
    return {
      ok: true, need: 'phone',
      say: '¿Qué teléfono? Di «sin teléfono» si no lo tienes.',
      options: ['Sin teléfono'],
      pending: { ...base, need: 'phone', newClient: true, asks: 1 },
    };
  }
  const who = res.kind === 'one' ? res.client.full_name : saidWho;
  base.who = who;
  if (!serviceQ) {
    return {
      ok: true, need: 'service', say: `¿Qué le hacemos a ${who}?`, ear: '¿Qué servicio?',
      options: ['Corporal', 'Facial'], pending: { ...base, need: 'service', asks: 1, newClient, phone },
    };
  }
  if (/^vacum$/i.test(serviceQ)) {
    return {
      ok: true, need: 'service', say: '¿Vacum de media hora o de una hora?', ear: '¿De media hora o de una hora?',
      options: VACUMS, pending: { ...base, need: 'service', choices: VACUMS, asks: 1, newClient, phone },
    };
  }
  const picked = /60|una hora/i.test(serviceQ) ? 'Vacum 60 min' : /30|media/i.test(serviceQ) ? 'Vacum 30 min' : null;
  if (!picked) {
    const asks = ctx?.prevNeed === 'service' ? (ctx.asks ?? 0) : 0;
    return {
      ok: true, need: 'service',
      say: asks >= 2 ? 'No lo pillo. Toca una en pantalla.' : 'No he pillado el servicio. ¿Facial, corporal, láser…?',
      options: ['Corporal', 'Facial'], pending: { ...base, need: 'service', asks: asks + 1, newClient, phone },
    };
  }
  if (startMin === null) {
    return {
      ok: true, need: 'time', say: `¿A qué hora le hacemos ${picked} a ${who}? Tengo 11:00 o 12:00.`,
      pending: { ...base, serviceQ: picked, need: 'time', slotMins: [660, 720], asks: 1, newClient, phone },
    };
  }
  const h = `${Math.floor(startMin / 60)}:${String(startMin % 60).padStart(2, '0')}`;
  return {
    ok: true, ready: true,
    say: `${who}${newClient ? ' (nueva)' : ''}, hoy a las ${h}, ${picked}. ¿La guardo?`,
    book: { who, startMin, serviceQ: picked, dayOffset, providerQ, newClient },
    draft: { ...DRAFT, startMin, clientId: newClient ? undefined : 'c1', clientName: newClient ? who : undefined },
  };
}

const server: Fake = call => {
  switch (call.action) {
    case 'previewBook': return fakeBook(call);
    case 'confirmBook': return { ok: true, say: 'Guardada.', href: '/agenda' };
    case 'matchClient': return call.args[0] === 'marta' ? 'Marta Sanz' : null;
    case 'talk': return { ok: false, fallback: true, reason: 'off', say: '' };
    case 'previewWait': return {
      ok: true, say: 'No tengo a Rosa. ¿Rosa María López o Rosario Díaz?', wait: true,
      matches: [{ id: 'r1', label: 'Rosa María López' }, { id: 'r2', label: 'Rosario Díaz' }], draft: { who: 'Rosa' },
    };
    case 'addWait': return { ok: true, say: `${call.args[0]} queda en espera.` };
    case 'previewCancel': return {
      ok: true, say: 'Hay varias. ¿Cuál cancelo?',
      matches: [{ id: 'a1', label: 'Lucía Pérez · 11:00 · Vacum' }, { id: 'a2', label: 'Lucía Gómez · 16:30 · Facial' }],
    };
    case 'applyCancel': return { ok: true, say: 'Cita cancelada.', href: '/hoy' };
    case 'previewMove': {
      const [who, startMin] = call.args;
      if (startMin == null) {
        return {
          ok: true, ready: false,
          say: `¿A qué hora muevo a ${who}? Tengo 16:00 o 17:00.`,
          ear: '¿A qué hora?',
          options: ['16:00', '17:00'],
          slotMins: [16 * 60, 17 * 60],
          moveAsk: { who, dayOffset: 0, providerQ: null },
        };
      }
      return { ok: true, ready: true, say: `Paso a ${who} a las ${startMin}. ¿De acuerdo?`, draft: { id: 'm1', date: '2026-09-04', startMin, providerId: 'p1' } };
    }
    case 'find': return { ok: true, say: `${call.args[0]} está apuntada a las 11:00, Vacum.`, href: '/hoy' };
    case 'late': return { ok: true, say: `Aviso a cabina: ${call.args[0]}. Llega tarde.`, href: '/hoy' };
    case 'waiting': return { ok: true, say: `${call.args[0]} está esperando. Aviso a cabina.`, href: '/hoy' };
    case 'slots': return { ok: true, say: 'Huecos hoy. Ana: 17:00, 18:00.', href: '/agenda' };
    case 'previewStatus': return {
      ok: true, say: `Pasa a cabina: ${call.args[0]}. ¿Lo marco?`, ear: '¿Lo marco?',
      matches: [{ id: 's1', label: `${call.args[0]} · 11:00 · Vacum` }],
    };
    default: return { ok: true, say: 'ok' };
  }
};

test('cita completa: homónimas, variantes, hora, corrección y sí', () => {
  const c = new Convo(server);
  c.say('cita para Lucía');
  assert.equal(c.lastSaid, '¿Lucía Pérez o Lucía Gómez?');
  assert.equal(c.state.pending?.need, 'client');

  c.say('Pérez');
  assert.equal(c.lastCall.action, 'previewBook');
  assert.deepEqual(c.lastCall.args[5]?.choices, LUCIAS, 'el apellido se resuelve entre las ofrecidas');
  assert.match(c.lastSaid, /Qué le hacemos a Lucía Pérez/);
  assert.equal(c.state.pending?.who, 'Lucía Pérez');

  c.say('vacum');
  assert.equal(c.lastSaid, '¿Vacum de media hora o de una hora?');
  assert.deepEqual(c.state.options, VACUMS);

  c.say('la de una hora');
  assert.match(c.lastSaid, /A qué hora/);
  assert.equal(c.state.pending?.need, 'time');

  c.say('a las once');
  assert.match(c.lastSaid, /11:00, Vacum 60 min. ¿La guardo\?/);
  assert.ok(c.state.confirm?.action);
  assert.ok(c.state.book, 'guarda la cita propuesta para corregirla');

  c.say('mejor a las doce');
  assert.match(c.lastSaid, /12:00.*¿La guardo\?/);

  c.say('sí');
  assert.equal(c.lastCall.action, 'confirmBook');
  assert.equal(c.lastSaid, 'Guardada.');
  assert.ok(c.closed);
  assert.deepEqual(c.navigated, ['/agenda']);
  assert.equal(c.state.confirm, null);
});

test('la segunda hora la eligen con «la primera» o tocando', () => {
  const c = new Convo(server);
  c.say('cita para Marta vacum de media hora');
  assert.equal(c.state.pending?.need, 'time');
  c.say('la segunda');
  assert.match(c.lastSaid, /12:00/);

  const d = new Convo(server);
  d.say('cita para Marta vacum de media hora').tap('11:00');
  assert.match(d.lastSaid, /11:00/);
});

test('clienta nueva: «no» cancela, «sí» sigue y confirma (nueva)', () => {
  const no = new Convo(server);
  no.say('cita para Rosa a las once');
  assert.match(no.lastSaid, /no está en fichas/);
  no.say('no');
  assert.ok(no.dismissed);
  assert.equal(no.state.pending, null);

  const si = new Convo(server);
  si.say('cita para Rosa a las once').say('sí');
  assert.equal(si.state.pending?.need, 'phone');
  si.say('sin teléfono');
  assert.equal(si.lastCall.action, 'previewBook');
  assert.equal(si.lastCall.args[5]?.newClient, true);
  assert.match(si.lastSaid, /Qué le hacemos a rosa/);
  si.say('vacum de una hora');
  assert.match(si.lastSaid, /rosa \(nueva\).*11:00.*¿La guardo\?/);
  si.yes();
  const last = si.lastCall;
  assert.equal(last.action, 'confirmBook');
  const draft = (last.args as unknown[])[0] as { clientName?: string };
  assert.equal(draft.clientName, 'rosa');
});

test('espera con parecidas: elegir la primera; «no» al confirmar cierra', () => {
  const c = new Convo(server);
  c.say('apunta a Rosa en espera');
  assert.equal(c.state.confirm?.pick, 'wait');
  assert.equal(c.state.confirm?.choices?.length, 2);
  c.say('la primera');
  assert.equal(c.lastSaid, '¿Apunto a Rosa María López en espera?');
  assert.equal(c.state.confirm?.action?.action, 'addWait');
  c.say('nah');
  assert.ok(c.dismissed);
  assert.equal(c.state.confirm, null);

  const d = new Convo(server);
  d.say('apunta a Rosa en espera').say('Rosario').say('sí');
  assert.equal(d.lastCall.action, 'addWait');
  assert.deepEqual(d.lastCall.args, ['Rosario Díaz', 'r2']);
});

test('cancelar entre varias: por hora dicha; «sí» sin elegir pide elegir', () => {
  const c = new Convo(server);
  c.say('cancela la cita de Lucía');
  assert.equal(c.state.confirm?.pick, 'cancel');
  c.say('sí');
  assert.equal(c.lastSaid, 'Elige una.');
  c.say('la de las cuatro y media');
  assert.equal(c.lastCall.action, 'applyCancel');
  assert.deepEqual(c.lastCall.args, ['a2']);
  assert.equal(c.lastSaid, 'Cita cancelada.');
});

test('no entendido: nombre suelto empieza cita; nube apagada avisa y apunta', () => {
  const c = new Convo(server);
  c.say('marta');
  assert.equal(c.calls[0].action, 'matchClient');
  assert.equal(c.lastCall.action, 'previewBook');
  assert.match(c.lastSaid, /Qué le hacemos a Marta Sanz/);

  const d = new Convo(server);
  d.say('cuánto cuesta el aparcamiento');
  assert.equal(d.lastCall.action, 'talk');
  assert.equal(d.lastSaid, 'Sin nube ahora. Dime servicio, hora o cita.');
  assert.deepEqual(d.reports, ['llm_off']);
  assert.equal(d.last.find(f => f.kind === 'speak')?.kind === 'speak' && d.last.find(f => f.kind === 'speak')?.then, 'listen');
});

test('servicio que no existe dos veces: toca una en pantalla', () => {
  const c = new Convo(server);
  c.say('cita para Marta a las once');
  c.say('pedicura lunar');
  assert.match(c.lastSaid, /No he pillado el servicio/);
  c.say('pedicura lunar');
  assert.equal(c.lastSaid, 'No lo pillo. Toca una en pantalla.');
  assert.equal(c.state.pending?.need, 'service');
});

test('charla y sin red', () => {
  const c = new Convo(server);
  c.say('qué tal');
  assert.equal(c.lastSaid, 'Bien, aquí. ¿Una cita o un hueco?');
  assert.equal(c.panel()?.mode, 'msg');
  assert.ok(!c.closed);

  const off = step(INITIAL, { kind: 'offline', call: { action: 'today', args: [] } });
  const spoke = off.effects.find(f => f.kind === 'speak');
  assert.equal(spoke?.kind === 'speak' ? spoke.text : '', 'Sin red. Escríbelo abajo.');
});

test('«no» en servicio no tira la cita; vacum en ¿la guardo? corrige', () => {
  const c = new Convo(server);
  c.say('cita para Marta a las once');
  assert.equal(c.state.pending?.need, 'service');
  c.say('no');
  assert.ok(!c.dismissed, 'no a medias no cierra');
  assert.equal(c.state.pending?.need, 'service');
  assert.equal(c.lastSaid, '¿Qué servicio?');

  const d = new Convo(server);
  d.say('cita para Marta vacum de una hora a las once');
  assert.ok(d.state.confirm, d.lastSaid);
  d.say('vacum');
  assert.notEqual(d.lastSaid, 'Corporal. ¿Nombre y hora?');
  assert.ok(d.lastCall.action === 'previewBook' || d.state.pending?.need === 'service' || d.state.confirm);
});

test('charla no pisa la pregunta; cancela pide el nombre', () => {
  const c = new Convo(server);
  c.say('cita para Marta a las once');
  assert.equal(c.state.pending?.need, 'service');
  c.say('gracias');
  assert.equal(c.state.pending?.need, 'service');
  assert.equal(c.lastSaid, '¿Qué servicio?');

  const d = new Convo(server);
  d.say('cancela');
  assert.equal(d.state.hold?.kind, 'cancel-who');
  assert.match(d.lastSaid, /quién/);
  d.say('Marta');
  assert.equal(d.lastCall.action, 'previewCancel');
});

test('mueve sin hora ofrece huecos', () => {
  const c = new Convo(server);
  c.say('mueve a Marta');
  assert.equal(c.lastCall.action, 'previewMove');
  assert.equal((c.lastCall.args as unknown[])[1], null);
  assert.equal(c.state.hold?.kind, 'move-time');
  assert.deepEqual(c.state.options, ['16:00', '17:00']);
  c.say('a las doce');
  assert.equal(c.lastCall.action, 'previewMove');
  assert.equal((c.lastCall.args as unknown[])[1], 12 * 60);

  const d = new Convo(server);
  d.say('mueve a Marta').tap('16:00');
  assert.equal(d.lastCall.action, 'previewMove');
  assert.equal((d.lastCall.args as unknown[])[1], 16 * 60);
});

test('sin cita mira huecos; no viene y la paso preguntan quién', () => {
  const w = new Convo(server);
  w.say('viene sin cita');
  assert.equal(w.lastCall.action, 'slots');
  assert.match(w.lastSaid, /Huecos/);

  const n = new Convo(server);
  n.say('no va a venir');
  assert.equal(n.state.hold?.kind, 'status-who');
  n.say('Marta');
  assert.equal(n.lastCall.action, 'previewStatus');
  assert.equal((n.lastCall.args as unknown[])[1], 'noshow');

  const p = new Convo(server);
  p.say('la paso');
  assert.equal(p.state.hold?.kind, 'status-who');
  p.say('Lucía');
  assert.equal(p.lastCall.action, 'previewStatus');
  assert.equal((p.lastCall.args as unknown[])[1], 'curso');

  const e = new Convo(server);
  e.say('Lucía está esperando');
  assert.equal(e.lastCall.action, 'waiting');
  assert.match(e.lastSaid, /esperando/);
});

test('está apuntada y llega tarde preguntan el nombre', () => {
  const f = new Convo(server);
  f.say('dice que está apuntada');
  assert.equal(f.state.hold?.kind, 'find-who');
  f.say('Marta');
  assert.equal(f.lastCall.action, 'find');
  assert.match(f.lastSaid, /está apuntada/);

  const l = new Convo(server);
  l.say('Marta llega tarde');
  assert.equal(l.lastCall.action, 'late');
  assert.match(l.lastSaid, /Aviso a cabina/);
});
