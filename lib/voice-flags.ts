/** Flags de voz en la nube. Apagar sin deploy: VOICE_CLOUD=0 / VOICE_LLM=0. */

export function voiceCloudEnabled() {
  return process.env.VOICE_CLOUD !== '0' && process.env.NEXT_PUBLIC_VOICE_CLOUD !== '0';
}

export function voiceLlmEnabled() {
  return process.env.VOICE_LLM !== '0'
    && process.env.NEXT_PUBLIC_VOICE_LLM !== '0'
    && !!process.env.OPENAI_API_KEY;
}
