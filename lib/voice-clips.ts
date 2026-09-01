import { forEar } from '@/lib/voice';
import clips from '@/lib/voice-clips.json';

export type VoiceClipKind = 'ask' | 'say';
export type VoiceClip = { id: string; kind: VoiceClipKind; text: string };

export const VOICE_CLIPS = clips as VoiceClip[];

function earKey(text: string) {
  return forEar(text)
    .replace(/[¿¡]/g, '')
    .replace(/[.!?…]+$/u, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const byEar = new Map(VOICE_CLIPS.map(c => [earKey(c.text), `/voice/${c.id}.mp3`]));

/** MP3 fijo de Marlenne, o null si la frase lleva nombres u horas. */
export function voiceClipUrl(text: string): string | null {
  return byEar.get(earKey(text)) ?? null;
}

export const VOICE_CLIP_URLS = VOICE_CLIPS.map(c => `/voice/${c.id}.mp3`);
