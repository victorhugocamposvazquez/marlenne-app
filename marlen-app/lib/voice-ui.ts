/** Voz + asistente flotante: solo con `NEXT_PUBLIC_VOICE_UI=1` (STT aún poco fiable). */
export function voiceUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_VOICE_UI === '1';
}