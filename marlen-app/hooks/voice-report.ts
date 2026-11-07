/** Apunta un fallo de voz sin bloquear nada: ni espera ni rompe si no hay red. */
export function reportVoice(said: string, outcome: string, detail?: string | null) {
  try {
    void fetch('/api/voice/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ said, outcome, detail: detail ?? null }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* */ }
}
