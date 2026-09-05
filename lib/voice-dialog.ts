/**
 * El diálogo de Marlenne como máquina pura: `step(state, event)` devuelve el estado nuevo
 * y qué hacer (hablar, escuchar, pintar, llamar al servidor). Sin DOM ni next/*:
 * el componente solo ejecuta efectos; esto se prueba con conversaciones enteras.
 */

import {
  VOICE_HELP, fold, isVoiceYes, parseBookLoose, parseVoice, pickSpokenIndex, saidDayOffset, saidService, takeTime,
} from '@/lib/voice';
import { NEW_CLIENT_CHIP } from '@/lib/voice-clients';
import { voiceLog } from '@/lib/voice-log';
import type {
  BookDraft, BookRef, Choice, FinalResult, MoveDraft, MoveTo, PendingBook, PreviewCtx, VoiceTalkResult, VoiceTurn,
} from '@/lib/voice-types';

/** «No», «nah», «para», «déjalo», «así no»: cerrar lo que se estaba confirmando. */
export const VOICE_NO = /^(no+|nah|nop|que no|ahora no|mejor no|para|parate|dejalo|dejalo asi|asi no|quita|cancelar?|anula|nada|olvidalo)(\b.*)?$/;

export type Pick = 'status' | 'cancel' | 'wait' | 'move';

/** Llamadas al servidor. El componente las ejecuta y devuelve el resultado como evento `server`. */
export type Call =
  | { action: 'previewBook'; args: [string, number | null, string | null, number, string | null, PreviewCtx?] }
  | { action: 'previewWait'; args: [string] }
  | { action: 'previewStatus'; args: [string, 'curso' | 'noshow'] }
  | { action: 'previewCancel'; args: [string, number] }
  | { action: 'previewMove'; args: [string, number, number, string | null, string | null] }
  | { action: 'slots'; args: [number, number | null, string | null, PendingBook['part'] | null] }
  | { action: 'today'; args: [] }
  | { action: 'matchClient'; args: [string]; meta: { text: string; loose: ReturnType<typeof parseBookLoose> } }
  | { action: 'talk'; args: [string, VoiceTurn[]] }
  | { action: 'confirmBook'; args: [BookDraft] }
  | { action: 'applyMove'; args: [MoveDraft] }
  | { action: 'applyCancel'; args: [string] }
  | { action: 'applyStatus'; args: [string, 'curso' | 'noshow'] }
  | { action: 'addWait'; args: [string, string | null] };

export type Confirm = {
  say: string;
  ear?: string;
  /** Qué se hace al decir «sí». Null cuando hay que elegir entre `choices`. */
  action: Call | null;
  choices?: Choice[];
  pick?: Pick;
  status?: 'curso' | 'noshow';
  moveTo?: MoveTo;
};

export type DialogState = {
  pending: PendingBook | null;
  /** Chips de la pregunta en curso (servicios, clientas u horas). */
  options: string[];
  confirm: Confirm | null;
  /** Cita propuesta, por si la corrigen («mejor a las doce»). */
  book: BookRef | null;
  history: VoiceTurn[];
};

export const INITIAL: DialogState = { pending: null, options: [], confirm: null, book: null, history: [] };

export type PanelSpec =
  | { mode: 'msg'; say: string }
  | { mode: 'ask'; say: string; options?: string[]; href?: string }
  | { mode: 'confirm'; say: string; choices?: Choice[] };

export type DialogEvent =
  | { kind: 'heard'; text: string }
  | { kind: 'tap'; option: string }
  | { kind: 'choose'; choice: Choice }
  | { kind: 'yes' }
  | { kind: 'dismiss' }
  | { kind: 'open-alta'; href: string }
  | { kind: 'server'; call: Call; result: unknown }
  /** La llamada no llegó (sin red) o reventó en el servidor. */
  | { kind: 'offline'; call: Call }
  | { kind: 'error'; call: Call };

export type Effect =
  | { kind: 'panel'; panel: PanelSpec }
  /** Hablar y, al acabar, seguir escuchando (el panel se queda) o cerrar el panel. */
  | { kind: 'speak'; text: string; ear?: string; then: 'listen' | 'close' }
  | { kind: 'navigate'; href: string }
  | { kind: 'call'; call: Call }
  | { kind: 'report'; said: string; outcome: string; detail?: string | null }
  | { kind: 'dismiss' };

export type StepResult = { state: DialogState; effects: Effect[] };

const fmtMin = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;

/** «La primera», «la de las once», «Pérez»: qué opción de la lista han dicho. */
export function spokenChoice(choices: Choice[], text: string): Choice | null {
  const pick = pickSpokenIndex(text, choices.length);
  if (pick != null) return choices[pick];
  const clock = takeTime(text).startMin;
  if (clock !== null) {
    const hh = fmtMin(clock);
    const byTime = choices.filter(c => c.label.includes(` ${hh} `) || c.label.endsWith(hh) || c.label.includes(`· ${hh}`));
    if (byTime.length === 1) return byTime[0];
  }
  const said = fold(text).replace(/[¿?¡!.,]/g, ' ').split(/\s+/).filter(w => w.length >= 3);
  const byName = choices.filter(c => {
    const label = fold(c.label.split('·')[0]);
    return said.some(w => label.split(/\s+/).some(t => t === w || (w.length >= 4 && t.startsWith(w))));
  });
  return byName.length === 1 ? byName[0] : null;
}

function ask(say: string, ear: string | undefined, pending: PendingBook, options: string[], href?: string) {
  return {
    patch: { pending, options, confirm: null as Confirm | null, book: null as BookRef | null },
    effects: [
      { kind: 'panel', panel: { mode: 'ask', say, options, href } },
      { kind: 'speak', text: say, ear, then: 'listen' },
    ] as Effect[],
  };
}

function confirmFx(c: Confirm): Effect[] {
  return [
    { kind: 'panel', panel: { mode: 'confirm', say: c.say, choices: c.choices } },
    { kind: 'speak', text: c.say, ear: c.ear, then: 'listen' },
  ];
}

function finishFx(say: string, href?: string, ear?: string): Effect[] {
  const fx: Effect[] = [{ kind: 'panel', panel: { mode: 'msg', say } }];
  if (href) fx.push({ kind: 'navigate', href });
  fx.push({ kind: 'speak', text: say, ear, then: 'close' });
  return fx;
}

function sayAndListen(say: string, ear?: string): Effect[] {
  return [
    { kind: 'panel', panel: { mode: 'msg', say } },
    { kind: 'speak', text: say, ear, then: 'listen' },
  ];
}

const CLEAR = { pending: null, options: [] as string[], confirm: null, book: null };

function done(state: DialogState, say: string, href?: string, ear?: string): StepResult {
  return { state: { ...state, ...CLEAR }, effects: finishFx(say, href, ear) };
}

function dismissed(state: DialogState): StepResult {
  return { state: { ...state, ...CLEAR }, effects: [{ kind: 'dismiss' }] };
}

function call(state: DialogState, c: Call, patch: Partial<DialogState> = {}): StepResult {
  return { state: { ...state, ...patch }, effects: [{ kind: 'call', call: c }] };
}

/** Lo que dice el servidor tras un preview o la nube: qué pregunta, qué confirma, o se acaba. */
export function applyTalk(state: DialogState, r: VoiceTalkResult): StepResult {
  const base: DialogState = { ...state, book: null };
  if (r.matches && r.matches.length > 1) {
    const confirm: Confirm = {
      say: r.say,
      ear: r.ear,
      action: null,
      choices: r.matches,
      pick: r.cancel ? 'cancel' : r.wait ? 'wait' : r.moveTo ? 'move' : 'status',
      status: r.status,
      moveTo: r.moveTo,
    };
    return { state: { ...base, confirm }, effects: confirmFx(confirm) };
  }
  if (r.ready && r.draft && r.move) {
    const confirm: Confirm = { say: r.say, ear: r.ear, action: { action: 'applyMove', args: [r.draft as MoveDraft] } };
    return { state: { ...base, pending: null, confirm }, effects: confirmFx(confirm) };
  }
  if (r.ready && r.draft && !r.move && !r.draft.who) {
    const confirm: Confirm = { say: r.say, ear: r.ear, action: { action: 'confirmBook', args: [r.draft as BookDraft] } };
    return { state: { ...base, pending: null, confirm, book: r.book ?? null }, effects: confirmFx(confirm) };
  }
  if (r.draft && typeof r.draft.who === 'string') {
    const clientId = typeof r.draft.clientId === 'string' ? r.draft.clientId : null;
    const confirm: Confirm = { say: r.say, ear: r.ear, action: { action: 'addWait', args: [r.draft.who, clientId] } };
    return { state: { ...base, confirm }, effects: confirmFx(confirm) };
  }
  if (r.matches?.length === 1 && r.cancel) {
    const confirm: Confirm = { say: r.say, ear: r.ear, action: { action: 'applyCancel', args: [r.matches[0].id] } };
    return { state: { ...base, confirm }, effects: confirmFx(confirm) };
  }
  if (r.matches?.length === 1 && r.status) {
    const confirm: Confirm = { say: r.say, ear: r.ear, action: { action: 'applyStatus', args: [r.matches[0].id, r.status] } };
    return { state: { ...base, confirm }, effects: confirmFx(confirm) };
  }
  if (r.need && r.pending) {
    const options = r.options ?? r.pending.slotMins?.map(fmtMin) ?? [];
    const a = ask(r.say, r.ear, r.pending, options, r.href);
    return { state: { ...base, ...a.patch }, effects: a.effects };
  }
  return done(base, r.say, r.href, r.ear);
}

function continueBook(state: DialogState, patch: Partial<PendingBook>): StepResult {
  const held = state.pending!;
  const p = { ...held, ...patch };
  const ctx: PreviewCtx = {
    choices: patch.choices === null ? null : (held.choices ?? null),
    prevNeed: held.need,
    asks: held.asks ?? 0,
    newClient: patch.newClient ?? held.newClient ?? false,
    part: p.part ?? null,
  };
  return call(state, { action: 'previewBook', args: [p.who, p.startMin, p.serviceQ, p.dayOffset, p.providerQ, ctx] });
}

function choose(state: DialogState, choice: Choice): StepResult {
  const c = state.confirm;
  if (!c) return { state, effects: [] };
  if (c.pick === 'move' && c.moveTo) {
    const m = c.moveTo;
    return call(state, { action: 'previewMove', args: [m.who, m.startMin, m.dayOffset, m.providerQ, choice.id] });
  }
  if (c.pick === 'wait') {
    const say = `¿Apunto a ${choice.label} en espera?`;
    const confirm: Confirm = { say, ear: '¿Apunto en espera?', action: { action: 'addWait', args: [choice.label, choice.id] } };
    return { state: { ...state, confirm }, effects: confirmFx(confirm) };
  }
  if (c.pick === 'cancel') return call(state, { action: 'applyCancel', args: [choice.id] });
  return call(state, { action: 'applyStatus', args: [choice.id, c.status ?? 'noshow'] });
}

function yes(state: DialogState): StepResult {
  const c = state.confirm;
  if (!c) return { state, effects: [] };
  if (!c.action) return { state, effects: [{ kind: 'speak', text: 'Elige una.', then: 'listen' }] };
  return call(state, c.action);
}

function correctBook(state: DialogState, book: BookRef, patch: Partial<BookRef>): StepResult {
  return call(state, {
    action: 'previewBook',
    args: [
      patch.who ?? book.who,
      patch.startMin !== undefined ? patch.startMin : book.startMin,
      patch.serviceQ !== undefined ? patch.serviceQ : book.serviceQ,
      patch.dayOffset ?? book.dayOffset,
      patch.providerQ !== undefined ? patch.providerQ : book.providerQ,
      { newClient: book.newClient ?? false, part: book.part ?? null },
    ],
  });
}

function heard(state: DialogState, text: string): StepResult {
  const said = fold(text);
  const c = state.confirm;
  if (c?.choices?.length) {
    const ch = spokenChoice(c.choices, text);
    if (ch) return choose(state, ch);
  }
  if (c && isVoiceYes(said)) return yes(state);
  if (c && (VOICE_NO.test(said) || parseVoice(text).kind === 'dismiss')) return dismissed(state);

  // «¿La guardo?» y contestan hora, día, servicio o profesional: se corrige, no se empieza de cero.
  const book = c ? state.book : null;
  if (book) {
    const clock = takeTime(text).startMin ?? (/^(mejor )?(a )?(la )?una$/.test(said) ? 13 * 60 : null);
    const day = saidDayOffset(text);
    const variant = /cavit|media hora|una hora|hora y media|dos horas|tres horas|minutos|corta|larga|gratuita/.test(said);
    const service = saidService(text);
    const pro = text.match(/\bcon ([a-záéíóúñ]+)/i)?.[1] ?? null;
    if (clock !== null || day !== null || variant || service || pro) {
      return correctBook(state, book, {
        startMin: clock ?? book.startMin,
        serviceQ: service || variant ? (variant && book.serviceQ ? `${book.serviceQ} ${text}` : text.trim()) : book.serviceQ,
        dayOffset: day ?? book.dayOffset,
        providerQ: pro ?? book.providerQ,
      });
    }
    return { state, effects: sayAndListen('¿La guardo? Di sí, o cambia hora o servicio.') };
  }

  const cmd = parseVoice(text);
  voiceLog('parse_kind', { kind: cmd.kind, said: text.slice(0, 80) });
  const held = state.pending;
  const options = state.options;
  const onlyNew = held?.need === 'client' && options.length === 1 && options[0] === NEW_CLIENT_CHIP;
  const bareNo = /^(no+|nah|nop|que no)$/.test(said);
  // «¿Rosa María o Rosario? ¿O es nueva?» → «no» quiere decir «ninguna», no «cancela».
  const noMeansNew = held?.need === 'client' && options.length > 1
    && options.includes(NEW_CLIENT_CHIP) && bareNo;
  // «No» a «¿la doy de alta?» cancela. En servicio/hora es «otra cosa», no se tira la cita.
  if (cmd.kind === 'dismiss') {
    if (onlyNew) return dismissed(state);
    if (held && bareNo) { /* sigue abajo: respuesta a la pregunta */ }
    else if (!noMeansNew) return dismissed(state);
  }

  // Con una pregunta abierta, «vacum» o «no sé» son respuestas, no charla.
  if (cmd.kind === 'chat' && !held && !c) {
    if (cmd.stay) return { state, effects: sayAndListen(cmd.say) };
    return done(state, cmd.say);
  }

  const abortHeld = cmd.kind === 'today' || cmd.kind === 'go'
    || cmd.kind === 'slots' || cmd.kind === 'status' || cmd.kind === 'wait' || cmd.kind === 'move'
    || (cmd.kind === 'cancel' && !bareNo);
  if (held && !abortHeld) {
    const pick = pickSpokenIndex(text, options.length);
    if (held.need === 'client') {
      const opt = pick != null ? options[pick] : null;
      const offersNew = options.includes(NEW_CLIENT_CHIP);
      if (opt === NEW_CLIENT_CHIP || /\b(nueva|nuevo|alta|apuntala|no esta|ninguna|de las dos no|otra)\b/.test(said)
        || (isVoiceYes(said) && onlyNew) || (offersNew && !onlyNew && bareNo)) {
        return continueBook(state, { newClient: true, choices: null });
      }
      if (onlyNew && VOICE_NO.test(said)) return dismissed(state);
      if (opt) return continueBook(state, { who: opt, choices: null });
      return continueBook(state, { who: cmd.kind === 'book' ? cmd.who : text.trim() });
    }
    if (held.need === 'provider') {
      const opt = pick != null ? options[pick] : null;
      return continueBook(state, { providerQ: opt ?? text.trim(), choices: null });
    }
    if (pick != null) {
      if (held.need === 'time' && held.slotMins?.[pick] != null) {
        return continueBook(state, { startMin: held.slotMins[pick] });
      }
      return continueBook(state, { serviceQ: options[pick] });
    }
    if (held.need === 'time') {
      const clock = takeTime(text).startMin
        ?? (cmd.kind === 'book' ? cmd.startMin : null)
        ?? (/^(a )?(la )?una( hora)?$/.test(said) ? 13 * 60 : null);
      if (clock !== null) return continueBook(state, { startMin: clock });
      if (held.serviceQ && /cavit|media|corta|larga|minutos|dos horas|hora y media|tres horas/.test(said)) {
        return continueBook(state, { serviceQ: `${held.serviceQ} ${text}`, startMin: held.startMin, choices: null });
      }
      return continueBook(state, { startMin: null, serviceQ: held.serviceQ });
    }
    const serviceQ = cmd.kind === 'book' && cmd.serviceQ ? cmd.serviceQ : text.trim();
    return continueBook(state, { serviceQ });
  }
  const s: DialogState = held ? { ...state, pending: null, options: [] } : state;

  switch (cmd.kind) {
    case 'unknown':
      return call(s, { action: 'matchClient', args: [cmd.text], meta: { text: cmd.text, loose: null } });
    case 'help':
      return { state: s, effects: sayAndListen(`Puedo: ${VOICE_HELP}`) };
    case 'go':
      return done(s, cmd.say, cmd.href);
    case 'search':
      return done(s, `Busco ${cmd.q}`, `/clientas?q=${encodeURIComponent(cmd.q)}`);
    case 'today':
      return call(s, { action: 'today', args: [] });
    case 'wait':
      if (!cmd.who) return done(s, 'Lista de espera', '/agenda?wait=1');
      return call(s, { action: 'previewWait', args: [cmd.who] });
    case 'status':
      return call(s, { action: 'previewStatus', args: [cmd.who, cmd.status] });
    case 'slots':
      return call(s, { action: 'slots', args: [cmd.dayOffset, cmd.startMin, cmd.providerQ, cmd.part ?? null] });
    case 'book':
      return call(s, {
        action: 'previewBook',
        args: [cmd.who, cmd.startMin, cmd.serviceQ, cmd.dayOffset, cmd.providerQ, cmd.part ? { part: cmd.part } : undefined],
      });
    case 'cancel':
      return call(s, { action: 'previewCancel', args: [cmd.who, cmd.dayOffset] });
    case 'move':
      return call(s, { action: 'previewMove', args: [cmd.who, cmd.startMin, cmd.dayOffset, cmd.providerQ, null] });
    default:
      return { state: s, effects: [] };
  }
}

function notUnderstood(state: DialogState, text: string, talk: VoiceTalkResult): StepResult {
  const off = talk.reason === 'off' || talk.reason === 'rate';
  const outcome = off ? 'llm_off' : talk.reason === 'timeout' ? 'llm_timeout' : 'unknown';
  const say = off
    ? 'Sin nube ahora. Dime servicio, hora o cita.'
    : 'No lo he pillado. Dime el servicio, la hora, o una cita.';
  return {
    state,
    effects: [{ kind: 'report', said: text, outcome, detail: talk.reason ?? null }, ...sayAndListen(say)],
  };
}

function fromServer(state: DialogState, c: Call, result: unknown): StepResult {
  switch (c.action) {
    case 'matchClient': {
      const named = result as string | null;
      const { text, loose } = c.meta;
      if (loose) {
        if (named) {
          return call(state, {
            action: 'previewBook',
            args: [
              named, loose.startMin, loose.serviceQ, loose.dayOffset, loose.providerQ,
              loose.part ? { part: loose.part } : undefined,
            ],
          });
        }
        return call(state, { action: 'talk', args: [text, state.history] });
      }
      if (named) return call(state, { action: 'previewBook', args: [text, null, null, 0, null] });
      const l = parseBookLoose(text);
      if (l) return call(state, { action: 'matchClient', args: [l.who], meta: { text, loose: l } });
      return call(state, { action: 'talk', args: [text, state.history] });
    }
    case 'talk': {
      const talk = result as VoiceTalkResult;
      if (!talk.fallback && talk.say) {
        const history = [
          ...state.history,
          { role: 'user' as const, content: c.args[0] },
          { role: 'assistant' as const, content: talk.say },
        ].slice(-8);
        return applyTalk({ ...state, history }, talk);
      }
      return notUnderstood(state, c.args[0], talk);
    }
    case 'previewBook':
    case 'previewWait':
      return applyTalk(state, result as VoiceTalkResult);
    case 'previewStatus':
      return applyTalk(state, { ...(result as VoiceTalkResult), status: c.args[1] });
    case 'previewCancel':
      return applyTalk(state, { ...(result as VoiceTalkResult), cancel: true });
    case 'previewMove':
      return applyTalk(state, { ...(result as VoiceTalkResult), move: true });
    case 'today':
    case 'slots':
    case 'confirmBook':
    case 'applyMove':
    case 'applyCancel':
    case 'applyStatus':
    case 'addWait': {
      const r = result as FinalResult;
      return done(state, r.say, r.href, r.ear);
    }
    default:
      return { state, effects: [] };
  }
}

function tapped(state: DialogState, option: string): StepResult {
  const held = state.pending;
  if (!held) return { state, effects: [] };
  if (held.need === 'client') {
    return continueBook(state, option === NEW_CLIENT_CHIP ? { newClient: true, choices: null } : { who: option, choices: null });
  }
  if (held.need === 'provider') {
    return continueBook(state, { providerQ: option, choices: null });
  }
  if (held.need === 'time') {
    const clock = takeTime(option).startMin ?? held.slotMins?.[state.options.indexOf(option)];
    if (clock != null) return continueBook(state, { startMin: clock });
  }
  return continueBook(state, { serviceQ: option });
}

export function step(state: DialogState, event: DialogEvent): StepResult {
  switch (event.kind) {
    case 'heard':
      return heard(state, event.text);
    case 'tap':
      return tapped(state, event.option);
    case 'choose':
      return choose(state, event.choice);
    case 'yes':
      return yes(state);
    case 'dismiss':
      return dismissed(state);
    case 'open-alta':
      return done(state, 'Abro el alta.', event.href);
    case 'server':
      return fromServer(state, event.call, event.result);
    case 'offline':
      // El parser va en el iPad; lo que necesita servidor, no. Se deja la pregunta y el campo de texto.
      return { state, effects: sayAndListen('Sin red. Escríbelo abajo.') };
    case 'error':
      return { state, effects: sayAndListen('Algo ha fallado. Prueba otra vez.') };
    default:
      return { state, effects: [] };
  }
}
