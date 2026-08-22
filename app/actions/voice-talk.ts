'use server';

import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { parseClock, weekdayOffset } from '@/lib/voice';
import {
  voiceAddWait, voicePreviewBook, voicePreviewCancel, voicePreviewMove,
  voicePreviewStatus, voiceSlots, voiceToday,
} from '@/app/actions/voice';
import { requireSession } from '@/lib/queries';

export type VoiceTurn = { role: 'user' | 'assistant'; content: string };

export type VoiceTalkResult = {
  ok: boolean;
  fallback?: boolean;
  say: string;
  href?: string;
  ready?: boolean;
  draft?: Record<string, unknown>;
  matches?: { id: string; label: string }[];
  status?: 'curso' | 'noshow';
  cancel?: boolean;
  move?: boolean;
  need?: 'service' | 'time';
  pending?: {
    who: string;
    startMin: number | null;
    dayOffset: number;
    providerQ: string | null;
    serviceQ: string | null;
    need: 'service' | 'time';
    choices?: string[];
  };
  options?: string[];
};

function dayOf(label?: string | null) {
  if (!label) return 0;
  return weekdayOffset(label) ?? 0;
}

export function voiceLlmReady() {
  return !!process.env.OPENAI_API_KEY;
}

export async function voiceTalk(text: string, history: VoiceTurn[] = []): Promise<VoiceTalkResult> {
  await requireSession();
  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, fallback: true, say: '' };
  }

  let last: VoiceTalkResult = { ok: true, say: '' };

  let result;
  try {
  result = await generateText({
    model: openai('gpt-4o-mini'),
    maxSteps: 5,
    system: `Eres Marlenne, la agenda del centro de estética. Hablas en español, breve, de tú.
Solo agenda: citas, huecos, cabina, no-show, espera. Nunca fotos, medidas, notas ni salud.
Usa las herramientas. No inventes huecos ni nombres.
Si falta el servicio, llama a preview_cita igual (sin servicio) y pregunta cuál es. No mandes a abrir el alta.
Si el equipo responde solo con el nombre del servicio, vuelve a llamar a preview_cita con ese servicio.
Las herramientas de escribir solo PREVISUALIZAN: tú preguntas si lo hacemos. El equipo confirma en pantalla.`,
    messages: [
      ...history.slice(-6).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: text },
    ],
    tools: {
      hoy: tool({
        description: 'Resumen de las citas de hoy: cabina y siguientes.',
        parameters: z.object({}),
        execute: async () => { last = await voiceToday(); return last; },
      }),
      huecos: tool({
        description: 'Quién tiene hueco un día y/o hora, o a qué hora está libre una profesional.',
        parameters: z.object({
          dia: z.string().optional().describe('hoy, mañana, lunes…'),
          hora: z.string().optional().describe('11:30 o 11'),
          profesional: z.string().optional(),
        }),
        execute: async ({ dia, hora, profesional }) => {
          last = await voiceSlots(dayOf(dia), hora ? parseClock(hora) : null, profesional ?? null);
          return last;
        },
      }),
      preview_cita: tool({
        description: 'Preparar una cita nueva. No la guarda.',
        parameters: z.object({
          clienta: z.string(),
          dia: z.string().optional(),
          hora: z.string().optional().describe('11:30 o 11'),
          servicio: z.string().optional(),
          profesional: z.string().optional(),
        }),
        execute: async ({ clienta, dia, hora, servicio, profesional }) => {
          last = await voicePreviewBook(clienta, hora ? parseClock(hora) : null, servicio ?? null, dayOf(dia), profesional ?? null);
          return last;
        },
      }),
      preview_estado: tool({
        description: 'Pasa a cabina (curso) o marcar no vino (noshow). No lo aplica.',
        parameters: z.object({
          clienta: z.string(),
          estado: z.enum(['curso', 'noshow']),
        }),
        execute: async ({ clienta, estado }) => {
          last = { ...(await voicePreviewStatus(clienta, estado)), status: estado };
          return last;
        },
      }),
      preview_espera: tool({
        description: 'Poner a alguien en lista de espera. No lo apunta aún.',
        parameters: z.object({ clienta: z.string() }),
        execute: async ({ clienta }) => {
          last = { ok: true, say: `¿Pongo a ${clienta} en espera?`, draft: { who: clienta } };
          return last;
        },
      }),
      preview_cancelar: tool({
        description: 'Cancelar una cita. No la borra aún.',
        parameters: z.object({
          clienta: z.string(),
          dia: z.string().optional(),
        }),
        execute: async ({ clienta, dia }) => {
          last = { ...(await voicePreviewCancel(clienta, dayOf(dia))), cancel: true };
          return last;
        },
      }),
      preview_mover: tool({
        description: 'Mover una cita de ese día a otra hora o profesional. No la mueve aún.',
        parameters: z.object({
          clienta: z.string(),
          hora: z.string().describe('11:30 o 12'),
          dia: z.string().optional(),
          profesional: z.string().optional(),
        }),
        execute: async ({ clienta, hora, dia, profesional }) => {
          const start = parseClock(hora);
          if (start === null) {
            last = { ok: false, say: 'No he entendido la hora.' };
            return last;
          }
          last = { ...(await voicePreviewMove(clienta, start, dayOf(dia), profesional ?? null)), move: true };
          return last;
        },
      }),
    },
  });
  } catch {
    return { ok: false, fallback: true, say: '' };
  }

  const say = result.text?.trim() || last.say;
  return { ...last, ok: true, say };
}

export async function voiceConfirmWait(who: string) {
  return voiceAddWait(who);
}
