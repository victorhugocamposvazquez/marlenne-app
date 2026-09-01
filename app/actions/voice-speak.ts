'use server';

import { EdgeTTS } from 'edge-tts-universal';
import { getSession } from '@/lib/queries';

export type SpeakKind = 'ask' | 'say';

const VOICE = 'es-ES-ElviraNeural';

/** MP3 Elvira en base64. Misma voz que los clips. Sin iPad ni nova. */
export async function voiceSpeakMp3(text: string, _kind: SpeakKind = 'say') {
  const me = await getSession();
  if (!me) return null;
  const input = text.slice(0, 400).trim();
  if (!input) return null;
  try {
    const tts = new EdgeTTS(input, VOICE, { rate: '+6%', pitch: '+8Hz' });
    const result = await tts.synthesize();
    const buf = Buffer.from(await result.audio.arrayBuffer());
    if (!buf.length) return null;
    return buf.toString('base64');
  } catch {
    return null;
  }
}
