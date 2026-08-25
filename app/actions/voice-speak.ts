'use server';

import { getSession } from '@/lib/queries';

export type SpeakKind = 'ask' | 'say';

const ASK =
  'Habla en español de España. Eres una mujer joven, voz dulce, suave y cercana, como una recepcionista joven de un centro de estética. Tono un poco más agudo, nunca grave ni de locutora. Pregunta breve, entonación interrogativa al final, sin prisa y sin teatralidad.';
const SAY =
  'Habla en español de España. Eres una mujer joven, voz dulce, suave y cercana, como una recepcionista joven de un centro de estética. Tono un poco más agudo, nunca grave ni de locutora. Frases cortas, claras, naturales. Sin teatralidad.';

async function openaiSpeech(text: string, model: string, extra: Record<string, string> = {}) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      voice: 'nova',
      input: text,
      response_format: 'mp3',
      ...extra,
    }),
  });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString('base64');
}

/** MP3 en base64. Sin clave o sin sesión → null (el cliente usa la voz del sistema). */
export async function voiceSpeakMp3(text: string, kind: SpeakKind = 'say') {
  const me = await getSession();
  if (!me || !process.env.OPENAI_API_KEY) return null;
  const input = text.slice(0, 400).trim();
  if (!input) return null;

  const neural = await openaiSpeech(input, 'gpt-4o-mini-tts', {
    instructions: kind === 'ask' ? ASK : SAY,
  });
  if (neural) return neural;
  return openaiSpeech(input, 'tts-1-hd');
}
