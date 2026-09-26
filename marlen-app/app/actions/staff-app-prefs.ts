'use server';

import { getSession } from '@/lib/queries';
import { recordOpsAudit } from '@/lib/ops-support-audit';
import type { VoicePrefs } from '@/hooks/voice-prefs';
import { createClient } from '@/lib/supabase/server';

export async function saveStaffVoicePrefs(
  patch: Partial<VoicePrefs>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await getSession();
  if (!me) return { ok: false, error: 'Sesión caducada.' };

  const sb = createClient();
  const { error } = await sb.rpc('merge_my_app_prefs', {
    patch: { voice: patch },
  });

  if (error) return { ok: false, error: 'No se ha podido guardar.' };

  void recordOpsAudit('staff.voice_prefs', { patch });
  return { ok: true };
}
