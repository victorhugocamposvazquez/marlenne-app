import { EdgeTTS } from 'edge-tts-universal';
import { mp3ToSafariWav } from '@/lib/voice-wav';

export type ElviraAudio = { audio: Buffer; mime: 'audio/mpeg' | 'audio/wav' };

const VOICE = 'es-ES-ElviraNeural';
const cache = new Map<string, ElviraAudio>();
const inflight = new Map<string, Promise<ElviraAudio>>();

export function cachedElvira(input: string) {
  return cache.get(input) ?? null;
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

/** Elvira en WAV (Safari) o MP3 si el WAV falla. Misma voz que los clips. */
export function synthElvira(input: string): Promise<ElviraAudio> {
  const hit = cache.get(input);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(input);
  if (pending) return pending;
  const p = (async () => {
    const mp3 = await synthesizeRetry(input);
    const wav = await mp3ToSafariWav(mp3);
    const out: ElviraAudio = wav?.length ? { audio: wav, mime: 'audio/wav' } : { audio: mp3, mime: 'audio/mpeg' };
    cache.set(input, out);
    if (cache.size > 80) {
      const first = cache.keys().next().value;
      if (first) cache.delete(first);
    }
    return out;
  })();
  inflight.set(input, p);
  void p.finally(() => inflight.delete(input)).catch(() => {});
  return p;
}
