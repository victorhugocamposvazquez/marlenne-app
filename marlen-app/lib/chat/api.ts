'use client';

import {
  voiceConfirmBook,
  voiceFind,
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
import type { BookDraft, VoiceTalkResult } from '@/lib/voice-types';

type Pending =
  | { kind: 'book'; draft: BookDraft }
  | { kind: 'cancel'; id: string }
  | { kind: 'move'; id: string; date: string; startMin: number; providerId: string }
  | { kind: 'status'; id: string; status: 'curso' | 'noshow' };

const pending = new Map<string, Pending>();
let previewSeq = 0;
const nextPreviewId = () => `p${++previewSeq}-${Date.now()}`;

function text(say: string, size: 'md' | 'lg' = 'md'): Block {
  return { kind: 'text', text: say, size };
}

function fromTalk(r: VoiceTalkResult): TurnResult {
  if (!r.ok && !r.say) {
    return {
      blocks: [{
        kind: 'error',
        code: 'not_understood',
        text: 'No te he entendido. ¿Es una cita, una clienta, una tarea o la caja?',
        actions: [
          { id: 'cita', label: 'Cita', send: { intent: 'go', args: { href: '/agenda?new=1' } } },
          { id: 'hoy', label: 'Hoy', send: { intent: 'hoy' } },
        ],
      }],
    };
  }

  const blocks: Block[] = [];
  if (r.say) blocks.push(text(r.say, r.ready ? 'lg' : 'md'));

  if (r.ready && r.draft && r.book) {
    const previewId = nextPreviewId();
    const draft = r.draft as BookDraft;
    pending.set(previewId, { kind: 'book', draft });
    const expiresAt = new Date(Date.now() + 2 * 60_000).toISOString();
    const proposal: Proposal = {
      previewId,
      expiresAt,
      intent: 'cita_nueva',
      heading: 'Nueva cita',
      title: r.say || '¿La apunto?',
      fields: [
        { id: 'clienta', label: 'Clienta', value: draft.clientName ?? r.book.who, editable: false },
        { id: 'servicio', label: 'Servicio', value: r.book.serviceQ ?? '—', editable: false },
        { id: 'dia', label: 'Día', value: draft.date, editable: false },
        { id: 'hora', label: 'Hora', value: `${Math.floor(draft.startMin / 60)}:${String(draft.startMin % 60).padStart(2, '0')}`, editable: false },
      ],
      question: '¿La apunto?',
    };
    blocks.push({ kind: 'proposal', proposal });
  } else if (r.options && r.options.length > 0 && r.need) {
    blocks.push({
      kind: 'ask',
      question: r.say || '¿Cuál?',
      field: r.need === 'client' ? 'clienta' : r.need === 'service' ? 'servicio' : r.need === 'provider' ? 'profesional' : 'hora',
      picker: {
        type: 'chips',
        options: r.options.map((label, i) => ({ id: String(i), label })),
      },
    });
  } else if (r.matches && r.matches.length > 0) {
    blocks.push({
      kind: 'ask',
      question: r.say || '¿Cuál?',
      field: 'clienta',
      picker: {
        type: 'people',
        allowNew: false,
        options: r.matches.map(m => ({ id: m.id, name: m.label })),
      },
    });
  }

  if (r.href && !r.ready) {
    blocks.push({
      kind: 'alert',
      text: 'Abrir pantalla',
      action: { id: 'open', label: 'Ir', send: { intent: 'go', args: { href: r.href } } },
    });
  }

  return { blocks: blocks.length ? blocks : [text(r.say || 'Listo.')] };
}

async function runAgendaPhrase(phrase: string): Promise<TurnResult> {
  const llm = await voiceTalk(phrase);
  if (llm.ok && !llm.fallback) return fromTalk(llm);

  const cmd = parseVoice(phrase);
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
      return fromTalk(await voicePreviewStatus(cmd.who ?? '', cmd.status));
    case 'book':
      return fromTalk(await voicePreviewBook(cmd.who, cmd.startMin, cmd.serviceQ, cmd.dayOffset, cmd.providerQ));
    case 'cancel':
      return fromTalk(await voicePreviewCancel(cmd.who ?? '', cmd.dayOffset));
    case 'move':
      return fromTalk(await voicePreviewMove(cmd.who ?? '', cmd.startMin, cmd.dayOffset, cmd.providerQ));
    case 'go':
      return {
        blocks: [
          text(cmd.say),
          { kind: 'alert', text: cmd.say, action: { id: 'go', label: 'Abrir', send: { intent: 'go', args: { href: cmd.href } } } },
        ],
      };
    case 'help':
      return {
        blocks: [text('Puedo mirar el día, huecos, apuntar una cita, pasarla a cabina, marcar que no vino o la lista de espera. Dímelo en una frase.')],
      };
    case 'chat':
      return { blocks: [text(cmd.say)] };
    case 'dismiss':
      return { blocks: [text('Vale, lo dejo.')] };
    default:
      if (llm.say) return fromTalk(llm);
      return {
        blocks: [{
          kind: 'error',
          code: 'not_understood',
          text: 'Aún no hago eso desde aquí. ¿Quieres que abra la pantalla?',
          actions: [
            { id: 'agenda', label: 'Agenda', send: { intent: 'go', args: { href: '/agenda' } } },
            { id: 'clientas', label: 'Clientas', send: { intent: 'go', args: { href: '/clientas' } } },
          ],
        }],
      };
  }
}

function startRows(ctx: ScreenContext, role: string): StartRow[] {
  const rows: StartRow[] = [
    { id: 'hoy', label: 'Qué hay hoy', icon: 'hoy', send: { intent: 'hoy' }, now: ctx.route.startsWith('/hoy') },
    { id: 'cita', label: 'Nueva cita', icon: 'cita', send: { intent: 'go', args: { href: '/agenda?new=1' } } },
  ];
  if (role !== 'provider') {
    rows.push({ id: 'cobrar', label: 'Quién falta por cobrar', icon: 'cobrar', send: { intent: 'go', args: { href: '/finanzas' } } });
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
          'Lucía mañana a las once facial',
          'Quién sigue',
          'Huecos esta tarde',
        ],
      };
    },

    async turn(input: ActionSend, _ctx: ScreenContext, _fixed: Fixed): Promise<TurnResult> {
      if (typeof input !== 'string') {
        if (input.intent === 'go') {
          const href = String(input.args?.href ?? '/agenda');
          onNavigate?.(href);
          return { blocks: [text('Ahí lo tienes.')] };
        }
        if (input.intent === 'hoy') return fromTalk(await voiceToday());
        if (input.intent === 'next') return fromTalk(await voiceNext());
        const said = typeof input.args?.label === 'string' ? input.args.label : input.intent;
        return runAgendaPhrase(said);
      }
      return runAgendaPhrase(input);
    },

    async patchPreview(_previewId: string, _patch: PreviewPatch): Promise<Block> {
      return text('Ese cambio aún no se puede hacer aquí. Di la frase otra vez o toca la agenda.');
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
            next: r.href
              ? [{ id: 'open', label: 'Ver en agenda', send: { intent: 'go', args: { href: r.href } } }]
              : [],
          }],
        };
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
