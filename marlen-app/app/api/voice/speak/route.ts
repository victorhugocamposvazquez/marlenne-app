import { getSession } from '@/lib/queries';
import { voiceCloudEnabled } from '@/lib/voice-flags';
import { takeVoiceSlot, TTS_PER_MIN } from '@/lib/voice-limits';
import { voiceLog } from '@/lib/voice-log';
import { cachedElvira, synthElvira } from '@/lib/voice-tts';

export const runtime = 'nodejs';
export const maxDuration = 20;

/** Ruta y no server action: las actions van en cola y el audio retrasaba la respuesta del diálogo. */
export async function GET(req: Request) {
  const me = await getSession();
  if (!me) return new Response(null, { status: 401 });
  if (!voiceCloudEnabled()) {
    voiceLog('tts_fail', { reason: 'cloud_off' });
    return new Response(null, { status: 503 });
  }
  const input = (new URL(req.url).searchParams.get('t') ?? '').slice(0, 400).trim();
  if (!input) return new Response(null, { status: 400 });

  const cached = !!cachedElvira(input);
  if (!cached && !takeVoiceSlot(`tts:${me.salon_id}`, TTS_PER_MIN, 60_000)) {
    voiceLog('tts_fail', { reason: 'rate' });
    return new Response(null, { status: 429 });
  }
  try {
    const out = await synthElvira(input);
    voiceLog('tts_cloud', { cached, mime: out.mime, n: input.length });
    return new Response(new Uint8Array(out.audio), {
      headers: {
        'Content-Type': out.mime,
        'Content-Length': String(out.audio.length),
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch {
    voiceLog('tts_fail', { reason: 'edge' });
    return new Response(null, { status: 502 });
  }
}
