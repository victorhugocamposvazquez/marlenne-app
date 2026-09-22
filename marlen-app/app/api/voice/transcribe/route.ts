import { NextResponse } from 'next/server';
import { getSession } from '@/lib/queries';
import { salonVocab } from '@/lib/voice-vocab';
import { cleanHeard } from '@/lib/voice-heard';
import { voiceSttEnabled } from '@/lib/voice-flags';
import { STT_PER_MIN, takeVoiceSlot } from '@/lib/voice-limits';
import { voiceLog } from '@/lib/voice-log';

export const runtime = 'nodejs';
export const maxDuration = 20;

const MAX_BYTES = 2 * 1024 * 1024;
const GROQ = 'https://api.groq.com/openai/v1/audio/transcriptions';

export async function POST(req: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: 'sin sesión' }, { status: 401 });
  if (!voiceSttEnabled()) {
    return NextResponse.json({ fallback: true }, { status: 503 });
  }
  if (!takeVoiceSlot(`stt:${me.salon_id}`, STT_PER_MIN, 60_000)) {
    voiceLog('stt_error', { error: 'rate' });
    return NextResponse.json({ text: '' });
  }

  const form = await req.formData();
  const audio = form.get('audio');
  if (!(audio instanceof Blob) || !audio.size) {
    return NextResponse.json({ error: 'sin audio' }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: 'audio largo' }, { status: 413 });
  }

  const out = new FormData();
  out.append('file', audio, 'voz.m4a');
  out.append('model', 'whisper-large-v3-turbo');
  out.append('language', 'es');                 // sin esto detecta idioma y falla en clips cortos
  out.append('temperature', '0');
  out.append('response_format', 'verbose_json'); // hace falta para no_speech_prob
  let prompt = '';
  if (process.env.VOICE_STT_PROMPT !== '0') {
    try { prompt = await salonVocab(me.salon_id); } catch { /* sin vocabulario también transcribe */ }
    if (prompt) out.append('prompt', prompt);
  }

  const t0 = Date.now();
  const res = await fetch(GROQ, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: out,
  });
  if (!res.ok) {
    voiceLog('stt_error', { error: 'groq', status: res.status, prompt: prompt.length });
    return NextResponse.json({ error: 'stt' }, { status: 502 });
  }

  const data = await res.json() as {
    text?: string;
    segments?: { no_speech_prob?: number }[];
  };
  const text = cleanHeard(data.text ?? '', data.segments);
  voiceLog('stt_record', { ms: Date.now() - t0, n: text.length, empty: !text, prompt: prompt.length });
  return NextResponse.json({ text });
}
