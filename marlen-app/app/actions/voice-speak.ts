'use server';

import { EdgeTTS } from 'edge-tts-universal';
import { getSession } from '@/lib/queries';
import { voiceCloudEnabled } from '@/lib/voice-flags';
import { LLM_PER_HOUR, takeVoiceSlot, TTS_PER_MIN } from '@/lib/voice-limits';
import { voiceLog } from '@/lib/voice-log';
import { mp3ToSafariWav } from '@/lib/voice-wav';

export type SpeakKind = 'ask' | 'say';
export type VoiceSpeakResult = { b64: string; mime: 'audio/mpeg' | 'audio/wav' };

const VOICE = 'es-ES-ElviraNeural';
const cache = new Map<string, VoiceSpeakResult>();

function cacheGet(key: string) {
  return cache.get(key) ?? null;
}

function cacheSet(key: string, value: VoiceSpeakResult) {
  cache.set(key, value);
  if (cache.size > 80) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
}

async function synthesizeOnce(input: string) {
  const tts = new EdgeTTS(input, VOICE, { rate: '+6%', pitch: '+8Hz' });
  const result = await tts.synthesize();
  return Buffer.from(await result.audio.arrayBuffer());
}

async function synthesizeRetry(input: string) {
  let last: unknown;
  for (let i = 0; i < 2; i++) {
    try {
      const buf = await synthesizeOnce(input);
      if (buf.length) return buf;
    } catch (err) {
      last = err;
    }
    if (i === 0) await new Promise(r => setTimeout(r, 400));
  }
  throw last ?? new Error('tts');
}

/** MP3/WAV Elvira en base64. Misma voz que los clips. Sin iPad ni nova. */
export async function voiceSpeakMp3(text: string, _kind: SpeakKind = 'say'): Promise<VoiceSpeakResult | null> {
  const me = await getSession();
  if (!me) return null;
  if (!voiceCloudEnabled()) {
    voiceLog('tts_fail', { reason: 'cloud_off' });
    return null;
  }
  const input = text.slice(0, 400).trim();
  if (!input) return null;
  const hit = cacheGet(input);
  if (hit) {
    voiceLog('tts_cloud', { cached: true, n: input.length });
    return hit;
  }
  if (!takeVoiceSlot(`tts:${me.salon_id}`, TTS_PER_MIN, 60_000)) {
    voiceLog('tts_fail', { reason: 'rate' });
    return null;
  }
  try {
    const mp3 = await synthesizeRetry(input);
    const wav = await mp3ToSafariWav(mp3);
    const out: VoiceSpeakResult = wav?.length
      ? { b64: wav.toString('base64'), mime: 'audio/wav' }
      : { b64: mp3.toString('base64'), mime: 'audio/mpeg' };
    cacheSet(input, out);
    voiceLog('tts_cloud', { mime: out.mime, n: input.length });
    return out;
  } catch {
    voiceLog('tts_fail', { reason: 'edge' });
    return null;
  }
}
