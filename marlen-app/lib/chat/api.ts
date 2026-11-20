'use client';

import {
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
import { parseVoice } from '@/lib/voice';
import type { BookDraft, Choice, MoveDraft, VoiceTalkResult } from '@/lib/voice-types';

type Pending =
  | { kind: 'book'; draft: BookDraft }
  | { kind: 'cancel'; id: string }
  | { kind: 'move'; draft: MoveDraft }
  | { kind: 'status'; id: string; status: 'curso' | 'noshow' };

const pending = new Map<string, Pending>();
let previewSeq = 0;
const nextPreviewId = () => `p${++previewSeq}-${Date.now()}`;

function text(say: string, size: 'md' | 'lg' = 'md'): Block {
  return { kind: 'text', text: say, size };
}

function peopleAsk(question: string, matches: Choice[], field: 'clienta' | 'servicio' | 'profesional' | 'hora' = 'clienta'): Block {
  return {
    kind: 'ask',
    question,
    field,
    picker: {
      type: 'people',
      allowNew: false,
      options: matches.map(m => ({ id: m.id, name: m.label })),
    },
  };
}

function chipsAsk(question: string, labels: string[], field: 'clienta' | 'servicio' | 'profesional' | 'hora'): Block {
  return {
    kind: 'ask',
    question,
    field,
    picker: {
      type: 'chips',
      options: labels.map((label, i) => ({ id: String(i), label })),
    },
  };
}

function bookProposal(r: VoiceTalkResult): Block | null {
  if (!r.ready || !r.draft || !r.book) return null;
  const draft = r.draft as BookDraft;
  const previewId = nextPreviewId();
  pending.set(previewId, { kind: 'book', draft });
  const hh = `${Math.floor(draft.startMin / 60)}:${String(draft.startMin % 60).padStart(2, '0')}`;
  const proposal: Proposal = {
    previewId,
    expiresAt: new Date(Date.now() + 2 * 60_000).toISOString(),
    intent: 'cita_nueva',
    heading: 'Nueva cita',
    title: `${draft.date} · ${hh}`,
    fields: [
      { id: 'clienta', label: 'Clienta', value: draft.clientName ?? r.book.who, editable: false },
      { id: 'servicio', label: 'Servicio', value: r.book.serviceQ ?? '—', editable: false },
      { id: 'dia', label: 'Día', value: draft.date, editable: false },
      { id: 'hora', label: 'Hora', value: hh, editable: false },
    ],
    question: '¿La apunto?',
  };
  return { kind: 'proposal', proposal };
}

function statusProposal(id: string, status: 'curso' | 'noshow', label: string): Block {
  const previewId = nextPreviewId();
  pending.set(previewId, { kind: 'status', id, status });
  const proposal: Proposal = {
    previewId,
    expiresAt: new Date(Date.now() + 2 * 60_000).toISOString(),
    intent: status === 'curso' ? 'cita_pasar' : 'cita_no_vino',
    heading: status === 'curso' ? 'Pasar a cabina' : 'No vino',
    title: label,
    fields: [],
    question: '¿Lo marco?',
  };
  return { kind: 'proposal', proposal };
}

function cancelProposal(id: string, label: string): Block {
  const previewId = nextPreviewId();
  pending.set(previewId, { kind: 'cancel', id });
  return {
    kind: 'proposal',
    proposal: {
      previewId,
      expiresAt: new Date(Date.now() + 2 * 60_000).toISOString(),
      intent: 'cita_cancelar',
      heading: 'Cancelar cita',
      title: label,
      fields: [],
      question: '¿La cancelo?',
    },
  };
}

function fromTalk(r: VoiceTalkResult, hint?: { status?: 'curso' | 'noshow' }): TurnResult {
  if (!r.ok && !r.say && !(r.matches && r.matches.length)) {
    return {
      blocks: [{
        kind: 'error',
        code: 'not_understood',
        text: 'No te he entendido. ¿Es una cita, una clienta o el día de hoy?',
        actions: [
          { id: 'hoy', label: 'Qué hay hoy', send: { intent: 'hoy' } },
          { id: 'cita', label: 'Nueva cita', send: { intent: 'go', args: { href: '/agenda?new=1' } } },
        ],
      }],
    };
  }

  const blocks: Block[] = [];
  const book = bookProposal(r);
  if (book) {
    if (r.say) blocks.push(text(r.say));
    blocks.push(book);
    return { blocks };
  }

  if (r.ready && r.cancel && r.matches?.length === 1) {
    if (r.say) blocks.push(text(r.say));
    blocks.push(cancelProposal(r.matches[0].id, r.matches[0].label));
    return { blocks };
  }

  if (r.ready && r.move && r.draft && 'id' in (r.draft as object)) {
    const draft = r.draft as MoveDraft;
    const previewId = nextPreviewId();
    pending.set(previewId, { kind: 'move', draft });
    if (r.say) blocks.push(text(r.say));
    blocks.push({
      kind: 'proposal',
      proposal: {
        previewId,
        expiresAt: new Date(Date.now() + 2 * 60_000).toISOString(),
        intent: 'cita_mover',
        heading: 'Mover cita',
        title: r.say || '¿La muevo?',
        fields: [],
        question: '¿La muevo?',
      },
    });
    return { blocks };
  }

  if (hint?.status && r.matches?.length === 1 && /¿Lo marco\?|cabina|no vino/i.test(r.say || '')) {
    if (r.say) blocks.push(text(r.say));
    blocks.push(statusProposal(r.matches[0].id, hint.status, r.matches[0].label));
    return { blocks };
  }

  if (r.matches && r.matches.length > 1) {
    blocks.push(peopleAsk(r.say || '¿Cuál?', r.matches));
    return { blocks };
  }

  if (r.matches && r.matches.length === 1 && !r.ready) {
    // Una sola coincidencia informativa (p. ej. find)
    blocks.push(text(r.say || r.matches[0].label));
    return { blocks };
  }

  if (r.options && r.options.length > 0 && r.need) {
    const field = r.need === 'client' ? 'clienta'
      : r.need === 'service' ? 'servicio'
        : r.need === 'provider' ? 'profesional'
          : 'hora';
    blocks.push(chipsAsk(r.say || '¿Cuál?', r.options, field));
    return { blocks };
  }

  if (r.say) blocks.push(text(r.say));

  if (r.href && !r.ready) {
    blocks.push({
      kind: 'alert',
      text: 'Puedo abrir la pantalla.',
      action: { id: 'open', label: 'Abrir', send: { intent: 'go', args: { href: r.href } } },
    });
  }

  return { blocks: blocks.length ? blocks : [text('Listo.')] };
}

async function runAgendaPhrase(
  phrase: string,
  onNavigate?: (href: string) => void,
): Promise<TurnResult> {
  const trimmed = phrase.trim();
  if (!trimmed) return { blocks: [text('Dime qué necesitas.')] };

  if (/^(para|nada|olvidalo|olvídalo|déjalo|dejalo)$/i.test(trimmed)) {
    pending.clear();
    return { blocks: [text('Vale, lo dejo.')] };
  }

  const llm = await voiceTalk(trimmed);
  if (llm.ok && !llm.fallback) return fromTalk(llm);

  const cmd = parseVoice(trimmed);
  switch (cmd.kind) {
    case 'today':
      return fromTalk(await voiceToday());
    case 'next':
      return fromTalk(await voiceNext());
    case 'slots':
      return fromTalk(await voiceSlots(cmd.dayOffset, cmd.startMin, cmd.providerQ, cmd.part ?? null, cmd.durationMin ?? null));
    case 'find':
      return fromTalk(await voiceFind(cmd.who ?? ''));
    case 'waiting':
      return fromTalk(await voiceWaiting(cmd.who ?? ''));
    case 'wait':
      return fromTalk(await voicePreviewWait(cmd.who ?? ''));
    case 'status':
      return fromTalk(await voicePreviewStatus(cmd.who ?? '', cmd.status), { status: cmd.status });
    case 'late':
      return fromTalk(await voiceLate(cmd.who ?? '', cmd.mins ?? null));
    case 'book':
      return fromTalk(await voicePreviewBook(cmd.who, cmd.startMin, cmd.serviceQ, cmd.dayOffset, cmd.providerQ));
    case 'cancel':
      return fromTalk(await voicePreviewCancel(cmd.who ?? '', cmd.dayOffset));
    case 'move':
      return fromTalk(await voicePreviewMove(cmd.who ?? '', cmd.startMin, cmd.dayOffset, cmd.providerQ));
    case 'go':
      onNavigate?.(cmd.href);
      return { blocks: [text(cmd.say || 'Ahí lo tienes.')] };
    case 'help':
      return {
        blocks: [text('Puedo decirte el día, los huecos, apuntar una cita, pasarla a cabina, marcar que no vino o mirar la espera. Prueba: «quién sigue» o «cita a Lucía mañana a las once».')],
      };
    case 'chat':
      return { blocks: [text(cmd.say)] };
    case 'dismiss':
      pending.clear();
      return { blocks: [text('Vale, lo dejo.')] };
    case 'same':
      return fromTalk(await voiceFind(cmd.who ?? ''));
    default:
      if (llm.say) return fromTalk(llm);
      return {
        blocks: [{
          kind: 'error',
          code: 'not_understood',
          text: 'Eso aún no lo hago del todo aquí. ¿Abro la pantalla?',
          actions: [
            { id: 'agenda', label: 'Agenda', send: { intent: 'go', args: { href: '/agenda' } } },
            { id: 'clientas', label: 'Clientas', send: { intent: 'go', args: { href: '/clientas' } } },
            { id: 'hoy', label: 'Hoy', send: { intent: 'hoy' } },
          ],
        }],
      };
  }
}

function startRows(ctx: ScreenContext, role: string): StartRow[] {
  const rows: StartRow[] = [
    { id: 'hoy', label: 'Qué hay hoy', icon: 'hoy', send: { intent: 'hoy' }, now: ctx.route.startsWith('/hoy') },
    { id: 'sigue', label: 'Quién sigue', icon: 'cabina', send: { intent: 'next' } },
    { id: 'cita', label: 'Nueva cita', icon: 'cita', send: { intent: 'go', args: { href: '/agenda?new=1' } } },
  ];
  if (role !== 'provider') {
    rows.push({ id: 'clientas', label: 'Clientas', icon: 'espera', send: { intent: 'go', args: { href: '/clientas' } } });
  }
  rows.push({ id: 'tareas', label: 'Tareas', icon: 'tareas', send: { intent: 'go', args: { href: '/tareas' } } });
  return rows;
}

export function createMarlenChatApi(role: string, onNavigate?: (href: string) => void): ChatApi {
  return {
    async start(ctx) {
      return {
        rows: startRows(ctx, role),
        examples: [
          'Quién sigue',
          'Huecos esta tarde',
          'Pasa a Lucía a cabina',
        ],
      };
    },

    async turn(input: ActionSend, _ctx: ScreenContext, _fixed: Fixed, uttered?: string): Promise<TurnResult> {
      if (typeof input !== 'string') {
        if (input.intent === 'go') {
          const href = String(input.args?.href ?? '/agenda');
          onNavigate?.(href);
          return { blocks: [text('Ahí lo tienes.')] };
        }
        if (input.intent === 'hoy') return fromTalk(await voiceToday());
        if (input.intent === 'next') return fromTalk(await voiceNext());
        if (input.intent === 'answer') {
          const phrase = (uttered || String(input.args?.value ?? '')).trim();
          return runAgendaPhrase(phrase, onNavigate);
        }
        const said = (uttered || (typeof input.args?.label === 'string' ? input.args.label : '') || input.intent).trim();
        return runAgendaPhrase(said, onNavigate);
      }
      return runAgendaPhrase(uttered?.trim() || input, onNavigate);
    },

    async patchPreview(_previewId: string, _patch: PreviewPatch): Promise<Block> {
      return text('Para cambiarlo, dilo otra vez o ábrelo en la agenda.');
    },

    async confirm(previewId: string): Promise<TurnResult> {
      const p = pending.get(previewId);
      if (!p) {
        return {
          blocks: [{
            kind: 'error',
            code: 'expired',
            text: '¿El sí de qué?',
            actions: [],
          }],
        };
      }
      pending.delete(previewId);

      if (p.kind === 'book') {
        const r = await voiceConfirmBook(p.draft);
        return {
          blocks: [{
            kind: 'saved',
            title: r.ok ? 'Apuntada' : 'No se ha guardado',
            summary: r.say,
            next: r.ok && r.href
              ? [{ id: 'open', label: 'Ver', send: { intent: 'go', args: { href: r.href } } }]
              : [],
          }],
        };
      }

      if (p.kind === 'status') {
        const r = await voiceApplyStatus(p.id, p.status);
        return {
          blocks: [{
            kind: 'instant',
            text: r.say,
            undoId: `status-${p.id}`,
            next: r.href
              ? [{ id: 'hoy', label: 'Ver hoy', send: { intent: 'go', args: { href: r.href } } }]
              : [],
          }],
        };
      }

      if (p.kind === 'cancel') {
        const r = await voiceApplyCancel(p.id);
        return { blocks: [{ kind: 'instant', text: r.say, undoId: `cancel-${p.id}` }] };
      }

      if (p.kind === 'move') {
        const r = await voiceApplyMove(p.draft);
        return { blocks: [{ kind: 'instant', text: r.say, undoId: `move-${p.draft.id}` }] };
      }

      return { blocks: [text('Listo.')] };
    },

    async cancel(previewId: string) {
      pending.delete(previewId);
    },

    async undo(_undoId: string): Promise<TurnResult> {
      return { blocks: [text('Eso ya no se puede deshacer desde aquí.')] };
    },
  };
}
