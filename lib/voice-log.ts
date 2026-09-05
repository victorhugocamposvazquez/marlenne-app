export type VoiceEvent =
  | 'stt_error'
  | 'parse_kind'
  | 'tts_clip'
  | 'tts_cloud'
  | 'tts_fail'
  | 'llm_used'
  | 'llm_fail'
  | 'llm_skip';

/** Logs mínimos. En Vercel salen del server; en el iPad, de la consola. */
export function voiceLog(event: VoiceEvent, extra?: Record<string, unknown>) {
  if (typeof process !== 'undefined' && process.env?.NODE_TEST_CONTEXT) return;
  const row = { voice: event, ...extra, t: Date.now() };
  try {
    console.info(JSON.stringify(row));
  } catch {
    console.info('[voice]', event);
  }
}
