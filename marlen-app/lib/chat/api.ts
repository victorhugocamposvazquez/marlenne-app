'use client';

/**
 * Cerebro del chat de Marlén.
 *
 * Qué cambia respecto a la versión anterior:
 * - El estado vive en la instancia que devuelve `createMarlenChatApi`, no en el módulo.
 * - Una frase se prueba primero contra la pregunta abierta y solo después como orden nueva.
 * - Lo que se toca (intent `answer`) rellena el dato sin pasar por el parser.
 * - Cancelar, mover y pasar a cabina se pueden confirmar siempre: ya no dependen de `ready`,
 *   `cancel`, `move` ni de una expresión regular sobre el texto.
 * - Clienta nueva: el teléfono se pide en el chat y un solo sí crea ficha y cita. No se abre el modal.
 * - Con una propuesta de cita abierta, «mejor a las seis», «el martes» o «con Ana» la cambian.
 * - Una sola propuesta viva, con caducidad comprobada al confirmar.
 * - No se pinta «Deshacer»: todavía no deshace (ver ARREGLOS.md).
 */

import { listChatServices } from '@/app/actions/services';
import {
  voiceAddWait,
  voiceApplyCancel,
  voiceApplyMove,
  voiceApplyStatus,
  voiceConfirmBook,
  voiceFind,
  voiceLate,
  voiceNext,
  voicePreviewBook,
  voicePreviewCancel,
  voicePreviewMove,
  voicePreviewStatus,
  voicePreviewWait,
  voiceSlots,
  voiceToday,
  voiceWaiting,
} from '@/app/actions/voice';
import { voiceTalk } from '@/app/actions/voice-talk';
import type {
  ActionSend,
  Block,
  ChatApi,
  Fixed,
  PreviewPatch,
  Proposal,
  ScreenContext,
  StartRow,
  TurnResult,
} from '@/components/chat/MarlenChat';
import { fold, parseClock, parseVoice, pickSpokenIndex, saidDayOffset, takeTime, type VoiceCmd } from '@/lib/voice';
import type { BookDraft, Choice, MoveDraft, PendingBook, VoiceTalkResult, VoiceTurn } from '@/lib/voice-types';

/* ─────────────────────────── Tipos ─────────────────────────── */

type Status = 'curso' | 'noshow';

/** Lo que `voicePreviewBook` devuelve en `book` cuando la cita está lista. Sirve para rehacerla con un cambio. */
type BookCtx = {
  who: string;
  startMin: number;
  serviceQ: string;
  dayOffset: number;
  providerQ: string | null;
  newClient?: boolean;
  part?: PendingBook['part'];
  phone?: string | null;
};

type Pending =
  | { kind: 'book'; draft: BookDraft; book: BookCtx }
  | { kind: 'cancel'; id: string; label: string }
  | { kind: 'move'; draft: MoveDraft; who: string }
  | { kind: 'status'; id: string; status: Status; label: string }
  | { kind: 'wait'; who: string; clientId: string | null }
  | { kind: 'late'; who: string; mins: number | null };

/** Qué orden dio pie al resultado. Sustituye a mirar el texto para decidir qué pintar. */
type Hint = { status?: Status; cancel?: boolean; move?: boolean; wait?: boolean; book?: boolean };

/** Hay varias citas o varias clientas en pantalla: qué se hace con la que se toque. */
type Pick =
  | { kind: 'status'; status: Status }
  | { kind: 'cancel' }
  | { kind: 'move'; who: string; startMin: number | null; dayOffset: number; providerQ: string | null }
  | { kind: 'wait' };

/** Falta la hora de un cambio de cita. */
type MoveHold = { who: string; dayOffset: number; providerQ: string | null; slotMins: number[]; options: string[] };

/** Campos que algunas acciones devuelven y `VoiceTalkResult` puede no declarar. */
type Loose = VoiceTalkResult & {
  status?: Status;
  cancel?: boolean;
  move?: boolean;
  wait?: boolean;
  slotMins?: number[];
  moveAsk?: { who: string; dayOffset: number; providerQ: string | null };
  moveTo?: { who: string; startMin: number | null; dayOffset: number; providerQ: string | null };
  /** Solo si se aplica el cambio de `voiceFind` de ARREGLOS.md. */
  client?: { id: string; name: string };
  /** `voicePreviewLate`: todavía no está escrito. */
  late?: boolean;
};

type WhoCmd = Extract<VoiceCmd, { who: string | null }> | Extract<VoiceCmd, { kind: 'book' }>;

const TWO_MIN = 2 * 60_000;

/* ─────────────────────────── Texto ─────────────────────────── */

function text(say: string): Block {
  return { kind: 'text', text: say, size: 'md' };
}

function hhmm(min: number) {
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
}

/** «mar 24 nov», no `2026-11-24`. */
function dayLabel(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`)
    .toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(',', '')
    .replace(/\./g, '');
}

function titleName(s: string) {
  return s.replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1));
}

/** La voz dice «Abro el alta» cuando no hay hueco. Aquí no se abre nada. */
function clean(say: string) {
  return say.replace(/\s*Abro el alta\.?/i, '').trim();
}

const YES = /^(si|sip|vale|hazlo|dale|ok|okay|adelante|guardalo|guardala|apuntala|de acuerdo|confirmo|perfecto|correcto|venga)$/;
const NO = /^(no|mejor no|no gracias)$/;
const STOP = /^(para|nada|olvidalo|dejalo|da igual|cancela|cancelar)$/;
const NEW = /^(ninguna|ninguno|es nueva|nueva|no es ninguna)/;
/** Así empieza una corrección a la propuesta abierta, no una orden nueva. */
const CORRECTION = /^(mejor|pero|perdon|al final|que sea|ponla|ponlo|cambiala|cambia|pasala|a las|a la|sobre las|el|la|con|por la|manana|pasado manana|hoy)\b/;
/** El parser a veces toma el pronombre por nombre: «pásala a cabina» → «pasala». */
const PRONOUN = /^(pasala|pasalo|ponla|apuntala|muevela|cancelala|anulala|ella|esa|esta|la misma|la|lo|le|a ella)$/;

/* ─────────────────────────── Inicio ─────────────────────────── */

function startRows(ctx: ScreenContext, role: string): StartRow[] {
  const rows: StartRow[] = [
    { id: 'hoy', label: 'Qué hay hoy', icon: 'hoy', send: { intent: 'hoy' }, now: ctx.route.startsWith('/hoy') },
    { id: 'sigue', label: 'Quién sigue', icon: 'cabina', send: { intent: 'next' } },
    { id: 'cita', label: 'Cita nueva', icon: 'cita', send: 'Cita nueva' },
  ];
  if (role !== 'provider') {
    rows.push({ id: 'clientas', label: 'Buscar clienta', icon: 'espera', send: { intent: 'clienta_buscar' } });
  }
  rows.push({ id: 'tareas', label: 'Tareas', icon: 'tareas', send: { intent: 'tareas' } });
  return rows;
}

const NOT_UNDERSTOOD: Block = {
  kind: 'error',
  code: 'not_understood',
  text: 'No te he entendido. ¿Es una cita, el día de hoy o una clienta?',
  actions: [
    { id: 'cita', label: 'Cita nueva', send: 'Cita nueva' },
    { id: 'hoy', label: 'Qué hay hoy', send: { intent: 'hoy' } },
    { id: 'sigue', label: 'Quién sigue', send: { intent: 'next' } },
  ],
};

/* ─────────────────────────── API ─────────────────────────── */

export function createMarlenChatApi(role: string, _onNavigate?: (href: string) => void): ChatApi {
  // Todo el estado de la conversación. Una instancia, un hilo.
  let proposal: { id: string; expiresAt: number; p: Pending } | null = null;
  /** Cita a medias: lo que devolvió `voicePreviewBook` y lo que ofreció. */
  let hold: PendingBook | null = null;
  let holdOptions: string[] = [];
  let moveHold: MoveHold | null = null;
  let pick: Pick | null = null;
  /** Orden a la que le falta el nombre. */
  let askWho: WhoCmd | null = null;
  let fixed: Fixed = null;
  let history: VoiceTurn[] = [];
  let seq = 0;

  function reset() {
    proposal = null;
    hold = null;
    holdOptions = [];
    moveHold = null;
    pick = null;
    askWho = null;
  }

  function propose(p: Pending, shape: Omit<Proposal, 'previewId' | 'expiresAt'>): Block {
    const id = `p${++seq}-${Date.now()}`;
    const expiresAt = Date.now() + TWO_MIN;
    proposal = { id, expiresAt, p };
    hold = null;
    holdOptions = [];
    moveHold = null;
    pick = null;
    askWho = null;
    return { kind: 'proposal', proposal: { ...shape, previewId: id, expiresAt: new Date(expiresAt).toISOString() } };
  }

  function bookProposal(draft: BookDraft, book: BookCtx): Block {
    const hh = hhmm(draft.startMin);
    const isNew = !draft.clientId;
    const who = isNew ? titleName(book.who) : book.who;
    return propose({ kind: 'book', draft, book }, {
      intent: 'cita_nueva',
      heading: isNew ? 'Cita nueva y ficha nueva' : 'Cita nueva',
      title: `${dayLabel(draft.date)} · ${hh}`,
      fields: [
        {
          id: 'clienta',
          label: 'Clienta',
          value: who,
          note: isNew ? (draft.phone ? `· ${draft.phone}` : '· sin teléfono') : undefined,
          assumed: isNew ? 'ficha nueva' : undefined,
          editable: false,
        },
        { id: 'servicio', label: 'Servicio', value: book.serviceQ, editable: false },
        ...(book.providerQ ? [{ id: 'profesional' as const, label: 'Con', value: book.providerQ, editable: false }] : []),
        { id: 'dia', label: 'Día', value: dayLabel(draft.date), editable: true, picker: { type: 'text', value: '' } },
        { id: 'hora', label: 'Hora', value: hh, editable: true, picker: { type: 'text', value: hh } },
      ],
      question: '¿La apunto?',
    });
  }

  function statusProposal(id: string, status: Status, label: string): Block {
    return propose({ kind: 'status', id, status, label }, {
      intent: status === 'curso' ? 'cita_pasar' : 'cita_no_vino',
      heading: status === 'curso' ? 'Pasar a cabina' : 'No vino',
      title: label,
      fields: [],
      question: '¿Lo marco?',
    });
  }

  function cancelProposal(id: string, label: string): Block {
    return propose({ kind: 'cancel', id, label }, {
      intent: 'cita_cancelar',
      heading: 'Cancelar cita',
      title: label,
      fields: [],
      question: '¿La cancelo?',
    });
  }

  function chips(question: string, labels: string[], field: 'clienta' | 'servicio' | 'profesional' | 'hora'): Block {
    return {
      kind: 'ask',
      question,
      field,
      picker: { type: 'chips', options: labels.map((label, i) => ({ id: String(i), label })) },
    };
  }

  /** Traduce el resultado de una acción a bloques. `hint` dice qué orden lo pidió. */
  async function fromTalk(r0: VoiceTalkResult, hint: Hint = {}): Promise<TurnResult> {
    const r = r0 as Loose;
    const prevHold = hold;
    hold = r.pending ?? null;
    holdOptions = r.pending ? (r.options ?? []) : [];
    const say = clean(r.say ?? '');
    const status = hint.status ?? r.status;
    const isCancel = hint.cancel || r.cancel;
    const isMove = hint.move || r.move;

    // Cita lista.
    if (r.ready && r.draft && r.book) {
      const draft = r.draft as BookDraft;
      const book = r.book as BookCtx;
      if (draft.clientId) fixed = { id: draft.clientId, name: book.who };
      return { blocks: [bookProposal(draft, book)], fixed };
    }

    // Cambio de cita listo.
    if (isMove && r.ready && r.draft && 'id' in (r.draft as object)) {
      const draft = r.draft as MoveDraft;
      const who = moveHold?.who ?? r.moveAsk?.who ?? '';
      const block = propose({ kind: 'move', draft, who }, {
        intent: 'cita_mover',
        heading: 'Mover cita',
        title: `${dayLabel(draft.date)} · ${hhmm(draft.startMin)}`,
        fields: who ? [{ id: 'clienta', label: 'Clienta', value: who, editable: false }] : [],
        question: '¿La muevo?',
      });
      return { blocks: [block] };
    }

    // Cambio de cita: falta la hora.
    if (isMove && r.moveAsk && !r.ready) {
      moveHold = { ...r.moveAsk, slotMins: r.slotMins ?? [], options: r.options ?? [] };
      const q = `¿A qué hora muevo a ${r.moveAsk.who}?`;
      return { blocks: [moveHold.options.length ? chips(q, moveHold.options, 'hora') : text(q)] };
    }

    // Varias citas o varias clientas: se toca una.
    if (r.matches && r.matches.length > 1) {
      if (status) pick = { kind: 'status', status };
      else if (isCancel) pick = { kind: 'cancel' };
      else if (isMove && r.moveTo) pick = { kind: 'move', ...r.moveTo };
      else if (hint.wait || r.wait) pick = { kind: 'wait' };
      else pick = null;
      return {
        blocks: [{
          kind: 'ask',
          question: say || '¿Cuál?',
          field: 'clienta',
          picker: { type: 'people', allowNew: false, options: r.matches.map((m: Choice) => ({ id: m.id, name: m.label })) },
        }],
      };
    }

    // Una sola cita: se propone. Sin mirar el texto.
    if (r.ok && r.matches?.length === 1) {
      const m = r.matches[0];
      if (status) return { blocks: [statusProposal(m.id, status, m.label)] };
      if (isCancel) return { blocks: [cancelProposal(m.id, m.label)] };
    }

    // Retraso: la nube previsualiza; el sí escribe la nota.
    if (r.late && r.draft && 'who' in (r.draft as object)) {
      const d = r.draft as { who: string; mins?: number | null };
      const mins = d.mins ?? null;
      const block = propose({ kind: 'late', who: d.who, mins }, {
        intent: 'aviso_retraso',
        heading: 'Aviso a cabina',
        title: `${titleName(d.who)} llega ${mins != null ? `${mins} min ` : ''}tarde`,
        fields: [],
        question: '¿Aviso a cabina?',
      });
      return { blocks: [block] };
    }

    // Espera.
    if ((hint.wait || r.wait) && r.ok && r.draft && 'who' in (r.draft as object)) {
      const d = r.draft as { who: string; clientId?: string };
      const block = propose({ kind: 'wait', who: d.who, clientId: d.clientId ?? null }, {
        intent: 'espera_lista',
        heading: 'Lista de espera',
        title: titleName(d.who),
        fields: [],
        question: '¿La apunto en espera?',
      });
      return { blocks: [block] };
    }

    // Preguntas de la cita.
    if (r.need === 'service' && r.options?.length && !r.pending?.choices?.length) {
      const services = await listChatServices();
      return {
        blocks: [{
          kind: 'ask',
          question: say || '¿Qué servicio?',
          field: 'servicio',
          picker: {
            type: 'search',
            placeholder: 'Busca el servicio',
            options: services.length ? services : r.options.map((label, i) => ({ id: String(i), label })),
          },
        }],
      };
    }

    if (r.need === 'phone') {
      return { blocks: [chips(say || '¿Qué teléfono?', r.options ?? ['Sin teléfono'], 'clienta')] };
    }

    if (r.need && r.options && r.options.length > 0) {
      const field = r.need === 'client' ? 'clienta'
        : r.need === 'service' ? 'servicio'
          : r.need === 'provider' ? 'profesional'
            : 'hora';
      if (field === 'servicio' && r.options.length > 6) {
        return {
          blocks: [{
            kind: 'ask',
            question: say || '¿Cuál?',
            field: 'servicio',
            picker: { type: 'search', placeholder: 'Busca el servicio', options: r.options.map((label, i) => ({ id: String(i), label })) },
          }],
        };
      }
      return { blocks: [chips(say || '¿Cuál?', r.options, field)] };
    }

    // La cita se ha quedado sin hueco: no se pierde, se pregunta otro día.
    if (hint.book && prevHold && !r.ok && !r.pending) {
      hold = { ...prevHold, startMin: null, need: 'time', choices: undefined, slotMins: [] };
      holdOptions = [];
      return { blocks: [text(`${say || 'No queda hueco ese día.'} ¿Otro día?`)] };
    }

    if (r.client) fixed = r.client;
    if (!r.ok && !say) return { blocks: [NOT_UNDERSTOOD] };
    return { blocks: [text(say || 'Listo.')], fixed };
  }

  /* ───────── Cita a medias ───────── */

  function optionSaid(said: string, options: string[]) {
    const f = fold(said);
    const exact = options.find(o => fold(o) === f);
    if (exact) return exact;
    const i = pickSpokenIndex(said, options.length);
    return i == null ? null : options[i];
  }

  async function previewFromHold(h: PendingBook, over: Partial<PendingBook> = {}) {
    const x = { ...h, ...over };
    return voicePreviewBook(x.who, x.startMin, x.serviceQ, x.dayOffset, x.providerQ, {
      choices: x.choices ?? null,
      prevNeed: h.need,
      asks: h.asks,
      newClient: x.newClient ?? false,
      part: x.part ?? null,
      // '' es «sin teléfono» y también cuenta como contestado. null es «aún no se ha preguntado».
      ...(typeof x.phone === 'string' ? { phone: x.phone } : {}),
    });
  }

  /** La frase contesta la pregunta abierta de la cita. */
  async function resumeBook(h: PendingBook, said: string, cmd?: VoiceCmd): Promise<TurnResult> {
    const f = fold(said);
    const offered = optionSaid(said, holdOptions) ?? said;
    const over: Partial<PendingBook> = {};

    if (h.need === 'client') {
      if (NEW.test(f) || YES.test(f)) over.newClient = true;
      else over.who = offered;
    } else if (h.need === 'phone') {
      if (/sin telefono|no tiene|no lo se|no lo tengo/.test(f)) over.phone = '';
      else {
        const digits = said.replace(/\D/g, '');
        if (digits.length < 9) {
          const n = digits.length;
          return { blocks: [chips(n ? `Me salen ${n} cifras. ¿Me lo repites?` : '¿Qué teléfono?', ['Sin teléfono'], 'clienta')] };
        }
        over.phone = digits;
      }
    } else if (h.need === 'service') {
      over.serviceQ = cmd?.kind === 'book' && cmd.serviceQ ? cmd.serviceQ : offered;
    } else if (h.need === 'provider') {
      over.providerQ = offered.replace(/^con\s+/i, '');
    } else if (h.need === 'time') {
      const clock = takeTime(said).startMin ?? parseClock(said);
      if (clock != null) over.startMin = clock;
      else if (h.slotMins?.length) {
        const i = holdOptions.findIndex(o => o === offered);
        if (i >= 0 && h.slotMins[i] != null) over.startMin = h.slotMins[i];
      }
    }

    // «Mejor el martes», «a las cinco»: valen en cualquier paso menos al dar el nombre o el teléfono.
    if (h.need !== 'client' && h.need !== 'phone') {
      const day = saidDayOffset(said);
      if (day != null && day !== h.dayOffset) {
        over.dayOffset = day;
        if (over.startMin === undefined) over.startMin = takeTime(said).startMin;
      } else if (h.need !== 'time') {
        const clock = takeTime(said).startMin;
        if (clock != null) over.startMin = clock;
      }
    }

    return fromTalk(await previewFromHold(h, over), { book: true });
  }

  /** La frase es la hora que faltaba para mover la cita. */
  async function resumeMove(m: MoveHold, said: string): Promise<TurnResult | null> {
    const offered = optionSaid(said, m.options);
    const i = offered ? m.options.indexOf(offered) : -1;
    const clock = takeTime(said).startMin ?? parseClock(said) ?? (i >= 0 ? m.slotMins[i] ?? null : null);
    if (clock == null) return null;
    return fromTalk(await voicePreviewMove(m.who, clock, m.dayOffset, m.providerQ), { move: true });
  }

  /** Con la propuesta de cita abierta, la frase la cambia: hora, día o profesional. */
  async function tweakBook(book: BookCtx, said: string): Promise<TurnResult | null> {
    const clock = takeTime(said).startMin ?? parseClock(said);
    const day = saidDayOffset(said);
    const pro = fold(said).match(/\bcon ([a-zñ]+)/)?.[1] ?? null;
    if (clock == null && day == null && !pro) return null;
    const before = proposal;
    const r = await voicePreviewBook(book.who, clock ?? book.startMin, book.serviceQ, day ?? book.dayOffset, pro ?? book.providerQ, {
      newClient: book.newClient ?? false,
      part: book.part ?? null,
      ...(book.newClient ? { phone: book.phone ?? '' } : {}),
    });
    // El cambio no vale (profesional que no existe, día sin hueco): se dice y la propuesta sigue.
    if (!r.ok && before?.p.kind === 'book') {
      return { blocks: [text(clean(r.say ?? 'No puede ser.')), bookProposal(before.p.draft, before.p.book)] };
    }
    proposal = null;
    return fromTalk(r, { book: true });
  }

  /* ───────── Guardar ───────── */

  function saved(ok: boolean, title: string, summary: string): TurnResult {
    return { blocks: [{ kind: 'saved', title: ok ? title : 'No se ha guardado', summary, next: [] }], fixed };
  }

  async function settle(previewId: string): Promise<TurnResult> {
    const live = proposal;
    if (!live || live.id !== previewId || Date.now() > live.expiresAt) {
      if (live && Date.now() > live.expiresAt) proposal = null;
      return { blocks: [text('¿El sí de qué?')] };
    }
    proposal = null;
    const p = live.p;

    if (p.kind === 'book') {
      const r = await voiceConfirmBook(p.draft);
      const who = p.draft.clientId ? p.book.who : titleName(p.book.who);
      return saved(r.ok, 'Apuntada', r.ok
        ? `${who} · ${p.book.serviceQ} · ${dayLabel(p.draft.date)}, ${hhmm(p.draft.startMin)}`
        : r.say);
    }
    if (p.kind === 'status') {
      const r = await voiceApplyStatus(p.id, p.status);
      return saved(r.ok, p.status === 'curso' ? 'En cabina' : 'No vino', r.ok ? p.label : r.say);
    }
    if (p.kind === 'cancel') {
      const r = await voiceApplyCancel(p.id);
      return saved(r.ok, 'Cancelada', r.ok ? p.label : r.say);
    }
    if (p.kind === 'move') {
      const r = await voiceApplyMove(p.draft);
      const when = `${dayLabel(p.draft.date)}, ${hhmm(p.draft.startMin)}`;
      return saved(r.ok, 'Movida', r.ok ? (p.who ? `${p.who} · ${when}` : when) : r.say);
    }
    if (p.kind === 'wait') {
      const r = await voiceAddWait(p.who, p.clientId);
      return saved(r.ok, 'En espera', r.say);
    }
    const r = await voiceLate(p.who, p.mins);
    return saved(r.ok, 'Aviso a cabina', r.say);
  }

  /* ───────── Órdenes ───────── */

  /** Ejecuta una orden del parser. Si le falta el nombre, usa la clienta fijada o lo pregunta. */
  async function run(cmd: VoiceCmd): Promise<TurnResult> {
    const needsWho = 'who' in cmd;
    // «pasa a Lucía a cabina» llega del parser como «lucia a cabina»; «pásala a cabina», como «pasala».
    const heard = needsWho ? (cmd.who ?? '').replace(/\s+(a|en) cabina$/, '').replace(/^a\s+/, '').trim() : '';
    const who = needsWho ? ((PRONOUN.test(fold(heard)) ? '' : heard) || fixed?.name || '') : '';
    if (needsWho && !who) {
      askWho = cmd as WhoCmd;
      return { blocks: [text(cmd.kind === 'book' ? '¿Para quién es la cita?' : '¿De quién?')] };
    }

    switch (cmd.kind) {
      case 'today':
        return fromTalk(await voiceToday());
      case 'next':
        return fromTalk(await voiceNext());
      case 'slots':
        return fromTalk(await voiceSlots(cmd.dayOffset, cmd.startMin, cmd.providerQ, cmd.part ?? null, cmd.durationMin ?? null));
      case 'find':
        return fromTalk(await voiceFind(who));
      case 'search':
        return fromTalk(await voiceFind(cmd.q));
      case 'waiting':
        return fromTalk(await voiceWaiting(who));
      case 'wait':
        return fromTalk(await voicePreviewWait(who), { wait: true });
      case 'status':
        return fromTalk(await voicePreviewStatus(who, cmd.status), { status: cmd.status });
      case 'late': {
        const mins = cmd.mins ?? null;
        const block = propose({ kind: 'late', who, mins }, {
          intent: 'aviso_retraso',
          heading: 'Aviso a cabina',
          title: `${titleName(who)} llega ${mins != null ? `${mins} min ` : ''}tarde`,
          fields: [],
          question: '¿Aviso a cabina?',
        });
        return { blocks: [block] };
      }
      case 'book':
        return fromTalk(
          await voicePreviewBook(who, cmd.startMin, cmd.serviceQ, cmd.dayOffset, cmd.providerQ, cmd.part ? { part: cmd.part } : {}),
          { book: true },
        );
      case 'same':
        // «Lo de siempre»: `voicePreviewBook` ya sabe tomar el servicio de la última cita.
        return fromTalk(await voicePreviewBook(who, null, 'lo de siempre', 0, null), { book: true });
      case 'cancel':
        return fromTalk(await voicePreviewCancel(who, cmd.dayOffset), { cancel: true });
      case 'move':
        return fromTalk(await voicePreviewMove(who, cmd.startMin, cmd.dayOffset, cmd.providerQ), { move: true });
      case 'go':
        if (/[?&]new=1\b/.test(cmd.href)) {
          if (fixed) return run({ kind: 'book', who: fixed.name, startMin: null, serviceQ: null, dayOffset: 0, providerQ: null });
          askWho = { kind: 'book', who: '', startMin: null, serviceQ: null, dayOffset: 0, providerQ: null };
          return { blocks: [text('¿Para quién es la cita?')] };
        }
        if (cmd.href.startsWith('/tareas')) return { blocks: [text('Las tareas todavía no las llevo desde aquí.')] };
        return { blocks: [text('Eso todavía no lo llevo desde aquí. Puedo con citas, el día, la espera y buscar una clienta.')] };
      case 'help':
        return { blocks: [text('Puedo decirte el día, los huecos, apuntar una cita, moverla, cancelarla, pasarla a cabina, marcar que no vino o apuntar en espera. Prueba: «cita a Lucía mañana a las once».')] };
      case 'chat':
        return { blocks: [text(cmd.say)] };
      case 'dismiss':
        reset();
        return { blocks: [text('Vale, lo dejo.')] };
      default:
        return { blocks: [NOT_UNDERSTOOD] };
    }
  }

  /** Una frase, dicha o escrita. El orden importa: pregunta abierta antes que orden nueva. */
  async function phrase(raw: string): Promise<TurnResult> {
    const said = raw.trim();
    if (!said) return { blocks: [text('Dime qué necesitas.')] };
    const f = fold(said).replace(/[¿?¡!.,]/g, '').trim();

    if (proposal && Date.now() > proposal.expiresAt) proposal = null;

    // 1. Cortes. Valen siempre.
    if (STOP.test(f) && !(f.startsWith('cancela') && !proposal && !hold)) {
      const had = proposal || hold || moveHold || pick || askWho;
      reset();
      return { blocks: [text(had ? 'Vale, lo dejo.' : 'Vale.')] };
    }

    // 2. Sí y no, según lo que haya abierto.
    if (YES.test(f)) {
      if (proposal) return settle(proposal.id);
      if (hold?.need === 'client') return resumeBook(hold, 'es nueva');
      return { blocks: [text('¿El sí de qué?')] };
    }
    if (NO.test(f)) {
      if (proposal) { proposal = null; return { blocks: [text('No se ha guardado.')] }; }
      // «¿Lucía Pérez o Lucía Gómez? ¿O es nueva?» → «no» es «ninguna».
      if (hold?.need === 'client' && hold.choices?.length) return resumeBook(hold, 'ninguna');
      if (hold?.need === 'client') { reset(); return { blocks: [text('Vale, no la doy de alta.')] }; }
      const had = hold || moveHold || pick || askWho;
      reset();
      return { blocks: [text(had ? 'Vale, lo dejo.' : 'Vale.')] };
    }

    const cmd = parseVoice(said);
    const loose = cmd.kind === 'unknown' || cmd.kind === 'chat';

    // 3. Propuesta de cita abierta: «mejor a las seis», «el martes», «con Ana».
    if (proposal?.p.kind === 'book' && (loose || CORRECTION.test(f))) {
      const changed = await tweakBook(proposal.p.book, said);
      if (changed) return changed;
    }

    // 4. Falta la hora de un cambio de cita.
    if (moveHold && (loose || cmd.kind === 'slots' || cmd.kind === 'book')) {
      const moved = await resumeMove(moveHold, said);
      if (moved) return moved;
      if (loose) return { blocks: [moveHold.options.length ? chips('¿A qué hora?', moveHold.options, 'hora') : text('¿A qué hora?')] };
    }

    // 5. Cita a medias: la frase es la respuesta, salvo que sea claramente otra orden.
    if (hold) {
      const answers = loose || cmd.kind === 'book' || optionSaid(said, holdOptions) !== null
        || (hold.need === 'time' && (takeTime(said).startMin != null || saidDayOffset(said) != null));
      if (answers) return resumeBook(hold, said, cmd);
      // Otra orden: se hace, y se dice que la cita se deja.
      const left = hold.who ? `Dejo la cita de ${titleName(hold.who)}. ` : '';
      proposal = null;
      hold = null;
      holdOptions = [];
      const res = await run(cmd);
      const first = res.blocks[0];
      if (left && first?.kind === 'text') first.text = `${left}${first.text}`;
      return res;
    }

    // 6. Faltaba un nombre.
    if (askWho && loose) {
      const pending = askWho;
      askWho = null;
      return run({ ...pending, who: said } as VoiceCmd);
    }

    // 7. Orden nueva.
    if (!loose) {
      proposal = null;
      askWho = null;
      pick = null;
      moveHold = null;
      return run(cmd);
    }
    if (cmd.kind === 'chat') return { blocks: [text(cmd.say)] };

    // 8. La nube, con el hilo. Solo si no había nada abierto y el parser no lo entiende.
    const llm = await voiceTalk(said, history);
    if (llm.ok && !llm.fallback && (llm.say || llm.pending || llm.ready || llm.matches?.length)) {
      return fromTalk(llm, llm.pending || llm.ready ? { book: true } : {});
    }
    return { blocks: [NOT_UNDERSTOOD] };
  }

  /** Lo que se toca. No pasa por el parser. */
  async function answer(value: unknown, uttered: string): Promise<TurnResult> {
    const label = uttered.trim() || String(value ?? '');
    if (pick) {
      const p = pick;
      const id = String(value ?? '');
      pick = null;
      if (p.kind === 'status') return { blocks: [statusProposal(id, p.status, label)] };
      if (p.kind === 'cancel') return { blocks: [cancelProposal(id, label)] };
      if (p.kind === 'move') return fromTalk(await voicePreviewMove(p.who, p.startMin, p.dayOffset, p.providerQ, id), { move: true });
      return fromTalk(await voicePreviewWait(label), { wait: true });
    }
    if (moveHold) {
      const moved = await resumeMove(moveHold, label);
      if (moved) return moved;
    }
    if (hold) return resumeBook(hold, label);
    return phrase(label);
  }

  function remember(user: string, res: TurnResult) {
    const said = res.blocks
      .map(b => (b.kind === 'text' || b.kind === 'error' ? b.text : b.kind === 'ask' ? b.question : b.kind === 'proposal' ? b.proposal.question : ''))
      .filter(Boolean)
      .join(' ');
    history = [...history, { role: 'user', content: user }, { role: 'assistant', content: said || '…' }].slice(-6) as VoiceTurn[];
  }

  return {
    async start(ctx) {
      // El panel solo llama a start() con el hilo vacío: sin hilo no hay conversación que conservar.
      reset();
      history = [];
      fixed = null;
      return {
        rows: startRows(ctx, role),
        examples: ['Quién sigue', 'Huecos esta tarde', 'Pasa a Lucía a cabina'],
      };
    },

    async turn(input: ActionSend, _ctx: ScreenContext, panelFixed: Fixed, uttered?: string): Promise<TurnResult> {
      // La pastilla del panel manda: si la persona la ha quitado, aquí también.
      fixed = panelFixed;
      const said = (uttered ?? (typeof input === 'string' ? input : '')).trim();
      let res: TurnResult;

      if (typeof input === 'string') res = await phrase(said || input);
      else if (input.intent === 'answer') res = await answer(input.args?.value, said);
      else if (input.intent === 'hoy') { hold = null; res = await run({ kind: 'today' }); }
      else if (input.intent === 'next') { hold = null; res = await run({ kind: 'next' }); }
      else if (input.intent === 'clienta_buscar') {
        reset();
        askWho = { kind: 'find', who: null };
        res = { blocks: [text('¿A quién buscas?')] };
      } else if (input.intent === 'tareas') res = { blocks: [text('Las tareas todavía no las llevo desde aquí.')] };
      else res = await phrase(said || (typeof input.args?.label === 'string' ? input.args.label : input.intent));

      remember(said || (typeof input === 'string' ? input : input.intent), res);
      return res.fixed === undefined ? { ...res, fixed } : res;
    },

    async patchPreview(previewId: string, patch: PreviewPatch): Promise<Block> {
      const live = proposal;
      if (!live || live.id !== previewId || live.p.kind !== 'book') return text('¿El sí de qué?');
      const changed = await tweakBook(live.p.book, patch.field === 'hora' ? `a las ${String(patch.value)}` : String(patch.value));
      if (changed?.blocks.length) return changed.blocks[changed.blocks.length - 1];
      // No se ha entendido el cambio: la propuesta sigue como estaba.
      return bookProposal(live.p.draft, live.p.book);
    },

    async confirm(previewId: string): Promise<TurnResult> {
      return settle(previewId);
    },

    async cancel(previewId: string) {
      if (proposal?.id === previewId) proposal = null;
    },

    async undo(): Promise<TurnResult> {
      // No se manda ningún `undoId`, así que el panel no enseña «Deshacer». Ver ARREGLOS.md.
      return { blocks: [text('Eso todavía no se puede deshacer desde aquí.')] };
    },
  };
}
