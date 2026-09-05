import { createClient } from '@/lib/supabase/server';

/** Por qué no salió: para leerlo en Ajustes sin descifrar códigos. */
export const VOICE_OUTCOMES: Record<string, string> = {
  unknown: 'No entendió el comando',
  llm_off: 'Sin nube y sin comando',
  no_service: 'Servicio no reconocido',
  no_client: 'Clienta no encontrada',
  stt_error: 'El micro falló',
  llm_timeout: 'La nube tardó demasiado',
  dismiss: 'Cerró a mitad',
  book_ok: 'Cita guardada',
  book_fail: 'No se pudo guardar',
  tts_fail: 'No sonó (clip ni nube)',
};

/** Frases más repetidas de un fallo: alias que faltan. */
export function topSaidFor(rows: VoiceEventRow[], outcome: string, limit = 8) {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.outcome !== outcome) continue;
    const key = r.said.trim();
    if (!key || key.startsWith('(')) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export type VoiceEventRow = {
  id: string;
  said: string;
  outcome: string;
  detail: string | null;
  created_at: string;
};

/** Últimos 30 días, lo más nuevo primero. */
export async function listVoiceEvents(limit = 200): Promise<VoiceEventRow[]> {
  const { data, error } = await createClient()
    .from('voice_events')
    .select('id, said, outcome, detail, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as VoiceEventRow[];
}

/** Guarda un fallo. Nunca rompe el flujo: si falla, se pierde y ya. */
export async function reportVoiceEvent(said: string, outcome: string, detail?: string | null) {
  try {
    await createClient().rpc('voice_report', {
      p_said: said,
      p_outcome: outcome,
      p_detail: detail ?? null,
    });
  } catch {
    /* sin telemetría, sin drama */
  }
}
