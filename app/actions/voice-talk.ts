'use server';

import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { parseClock, weekdayOffset } from '@/lib/voice';
import {
  voiceAddWait, voiceFind, voiceLate, voicePreviewBook, voicePreviewCancel, voicePreviewMove,
  voicePreviewStatus, voicePreviewWait, voiceSlots, voiceToday,
} from '@/app/actions/voice';
import { requireSession } from '@/lib/require-session';
import { voiceLlmEnabled } from '@/lib/voice-flags';
import { LLM_PER_HOUR, takeVoiceSlot } from '@/lib/voice-limits';
import { voiceLog } from '@/lib/voice-log';
import type { VoiceTalkResult, VoiceTurn } from '@/lib/voice-types';

export type { VoiceTalkResult, VoiceTurn } from '@/lib/voice-types';

/** La nube tiene 8 s; después, frase propia y a seguir con los clips. */
const LLM_TIMEOUT_MS = 8000;

function dayOf(label?: string | null) {
  if (!label) return 0;
  return weekdayOffset(label) ?? 0;
}

export async function voiceTalk(text: string, history: VoiceTurn[] = []): Promise<VoiceTalkResult> {
  const me = await requireSession();
  if (!voiceLlmEnabled()) {
    voiceLog('llm_skip', { reason: 'off' });
    return { ok: false, fallback: true, reason: 'off', say: '' };
  }
  if (!takeVoiceSlot(`llm:${me.salon_id}`, LLM_PER_HOUR, 60 * 60_000)) {
    voiceLog('llm_fail', { reason: 'rate' });
    return { ok: false, fallback: true, reason: 'rate', say: '' };
  }

  let last: VoiceTalkResult = { ok: true, say: '' };

  // El historial tiene que alternar y empezar por el equipo; si no, OpenAI lo rechaza.
  const turns = history.slice(-6);
  while (turns.length && turns[0].role !== 'user') turns.shift();
  const aligned: VoiceTurn[] = [];
  for (const m of turns) {
    if (!m.content?.trim()) continue;
    if (aligned.length && aligned[aligned.length - 1].role === m.role) aligned.pop();
    aligned.push(m);
  }
  if (aligned.length && aligned[aligned.length - 1].role === 'user') aligned.pop();

  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), LLM_TIMEOUT_MS);

  let result;
  try {
  result = await generateText({
    model: openai('gpt-4o-mini'),
    maxSteps: 5,
    abortSignal: timeout.signal,
    system: `Eres Marlén, recepcionista del centro de estética. Español de España, de tú, una o dos frases.
Cercana, clara, sin teatro ni emojis. No repitas lo que acaba de oír si sonaba mal: responde a la intención.
Solo agenda: citas, huecos, cabina, no-show, espera, si está apuntada, aviso de retraso. Nunca fotos, medidas ni salud.
Usa las herramientas. No inventes huecos ni nombres.
Si falta el servicio, llama a preview_cita igual (sin servicio) y pregunta cuál es. No mandes a abrir el alta.
Si el equipo responde solo con el nombre del servicio, vuelve a llamar a preview_cita con ese servicio.
Las herramientas de escribir solo PREVISUALIZAN: tú preguntas si lo hacemos. El equipo confirma en pantalla.`,
    messages: [
      ...aligned.map(m => ({ role: m.role, content: m.content })),
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
          franja: z.enum(['manana', 'tarde']).optional().describe('esta mañana o esta tarde, si no hay hora'),
          minutos: z.number().optional().describe('duración del hueco en minutos: 30, 60, 90…'),
        }),
        execute: async ({ dia, hora, profesional, franja, minutos }) => {
          last = await voiceSlots(dayOf(dia), hora ? parseClock(hora) : null, profesional ?? null, franja ?? null, minutos ?? null);
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
          franja: z.enum(['manana', 'tarde']).optional().describe('esta mañana o esta tarde, si no hay hora'),
        }),
        execute: async ({ clienta, dia, hora, servicio, profesional, franja }) => {
          last = await voicePreviewBook(
            clienta, hora ? parseClock(hora) : null, servicio ?? null, dayOf(dia), profesional ?? null,
            franja ? { part: franja } : undefined,
          );
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
          last = await voicePreviewWait(clienta);
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
        description: 'Mover una cita de ese día a otra hora o profesional. Sin hora, ofrece huecos. No la mueve aún.',
        parameters: z.object({
          clienta: z.string(),
          hora: z.string().optional().describe('11:30 o 12; si falta, se piden huecos'),
          dia: z.string().optional(),
          profesional: z.string().optional(),
        }),
        execute: async ({ clienta, hora, dia, profesional }) => {
          last = { ...(await voicePreviewMove(clienta, hora ? parseClock(hora) : null, dayOf(dia), profesional ?? null)), move: true };
          return last;
        },
      }),
      buscar_cita: tool({
        description: 'Mira si una clienta está apuntada hoy, o si está en fichas.',
        parameters: z.object({ clienta: z.string() }),
        execute: async ({ clienta }) => {
          last = await voiceFind(clienta);
          return last;
        },
      }),
      aviso_retraso: tool({
        description: 'Avisa a cabina de que una clienta llega tarde. Apunta una nota en la cita de hoy.',
        parameters: z.object({
          clienta: z.string(),
          minutos: z.number().optional().describe('minutos de retraso, si los ha dicho'),
        }),
        execute: async ({ clienta, minutos }) => {
          last = await voiceLate(clienta, minutos ?? null);
          return last;
        },
      }),
    },
  });
  } catch {
    const timedOut = timeout.signal.aborted;
    voiceLog('llm_fail', { reason: timedOut ? 'timeout' : 'openai' });
    // Si una herramienta ya dejó algo útil (un preview), vale aunque la nube no rematara la frase.
    if (last.say) return { ...last, ok: true };
    return { ok: false, fallback: true, reason: timedOut ? 'timeout' : 'openai', say: '' };
  } finally {
    clearTimeout(timer);
  }

  const say = result.text?.trim() || last.say;
  voiceLog('llm_used', { n: text.length });
  return { ...last, ok: true, say };
}

export async function voiceConfirmWait(who: string) {
  return voiceAddWait(who);
}
