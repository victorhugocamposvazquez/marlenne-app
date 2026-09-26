'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { applyServerVoicePrefs, type VoicePrefs } from '@/hooks/voice-prefs';

/** Misma cuenta en otro móvil u Ops: prefs de voz al vuelo. */
export default function StaffPrefsSync({
  staffId,
  voice,
}: {
  staffId: string;
  voice: VoicePrefs | null;
}) {
  useEffect(() => {
    if (voice) applyServerVoicePrefs(voice);
  }, [voice]);

  useEffect(() => {
    const sb = createClient();
    const channel = sb
      .channel(`staff-prefs:${staffId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'staff',
          filter: `id=eq.${staffId}`,
        },
        payload => {
          const row = payload.new as { app_prefs?: { voice?: VoicePrefs } };
          const v = row.app_prefs?.voice;
          if (v && typeof v === 'object') applyServerVoicePrefs(v as VoicePrefs);
        },
      )
      .subscribe();

    return () => {
      void sb.removeChannel(channel);
    };
  }, [staffId]);

  return null;
}
