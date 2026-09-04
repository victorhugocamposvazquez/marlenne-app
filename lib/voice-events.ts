import { createClient } from '@/lib/supabase/server';

/** Por qué no salió: para leerlo en Ajustes sin descifrar códigos. */
export const VOICE_OUTCOMES: Record<string, string> = {
  unknown: 'No entendió el comando',
  llm_off: 'Sin nube y sin comando',
  no_service: 'Servicio no reconocido',
  no_client: 'Clienta no encontrada',
  stt_error: 'El micro falló',
  llm_timeout: 'La nube tardó demasiado',
};

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
