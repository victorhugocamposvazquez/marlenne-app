import { NextResponse } from 'next/server';
import { getSession } from '@/lib/queries';
import { salonVocab } from '@/lib/voice-vocab';
import { cleanHeard, type SttSegment, type SttVocab } from '@/lib/voice-heard';
import { voiceSttEnabled } from '@/lib/voice-flags';
import { STT_PER_MIN, takeVoiceSlot } from '@/lib/voice-limits';
import { voiceLog } from '@/lib/voice-log';

export const runtime = 'nodejs';
export const maxDuration = 20;

const MAX_BYTES = 2 * 1024 * 1024;
const GROQ = 'https://api.groq.com/openai/v1/audio/transcriptions';
/** Turbo falla más en frases cortas en español; la diferencia de latencia en Groq es pequeña. */
const MODEL = process.env.VOICE_STT_MODEL || 'whisper-large-v3';
/** El cliente corta a los 10 s: no seguir esperando a Groq después. */
const GROQ_TIMEOUT_MS = 9000;

function sttName(audio: Blob) {
  const name = (audio as Blob & { name?: string }).name;
  if (name && /\.(m4a|mp4|webm|ogg|wav|mp3)$/i.test(name)) return name;
  return /webm/.test(audio.type) ? 'voz.webm' : 'voz.m4a';
}

export async function POST(req: Request) {
  const [me, form] = await Promise.all([
    getSession(),
    req.formData().catch(() => null),
  ]);
  if (!me) return NextResponse.json({ error: 'sin sesión' }, { status: 401 });
  if (!voiceSttEnabled()) {
    return NextResponse.json({ fallback: true }, { status: 503 });
  }
  if (!takeVoiceSlot(`stt:${me.salon_id}`, STT_PER_MIN, 60_000)) {
    voiceLog('stt_error', { error: 'rate' });
    return NextResponse.json({ text: '' });
  }

  const audio = form?.get('audio');
  if (!(audio instanceof Blob) || !audio.size) {
    return NextResponse.json({ error: 'sin audio' }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: 'audio largo' }, { status: 413 });
  }
  const clipMs = Number(form?.get('ms')) || 0;
  const lag = Number(form?.get('lag'));

  const out = new FormData();
  out.append('file', audio, sttName(audio));
  out.append('model', MODEL);
  out.append('language', 'es');                 // sin esto detecta idioma y falla en clips cortos
  out.append('temperature', '0');
  out.append('response_format', 'verbose_json'); // hace falta para no_speech_prob
  let vocab: SttVocab | null = null;
  if (process.env.VOICE_STT_PROMPT !== '0') {
    try { vocab = await salonVocab(me.salon_id); } catch { /* sin vocabulario también transcribe */ }
    if (vocab?.prompt) out.append('prompt', vocab.prompt);
  }

  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(GROQ, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: out,
      signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
    });
  } catch {
    voiceLog('stt_error', { error: 'groq_timeout', ms: Date.now() - t0, model: MODEL });
    return NextResponse.json({ error: 'stt' }, { status: 504 });
  }
  if (!res.ok) {
    voiceLog('stt_error', { error: 'groq', status: res.status, model: MODEL, prompt: vocab?.prompt.length ?? 0 });
    return NextResponse.json({ error: 'stt' }, { status: 502 });
  }

  const data = await res.json() as { text?: string; segments?: SttSegment[] };
  const text = cleanHeard(data.text ?? '', data.segments, vocab);
  voiceLog('stt_record', {
    ms: Date.now() - t0,
    clip: clipMs,
    lag: Number.isFinite(lag) ? lag : null,
    n: text.length,
    empty: !text,
    dropped: !text && !!data.text?.trim(),
    model: MODEL,
    prompt: vocab?.prompt.length ?? 0,
  });
  return NextResponse.json({ text });
}
