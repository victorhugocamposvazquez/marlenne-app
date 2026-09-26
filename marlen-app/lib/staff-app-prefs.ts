import type { VoicePrefs } from '@/hooks/voice-prefs';

export type StaffAppPrefs = {
  voice?: Partial<VoicePrefs>;
};

export function voiceFromStaffPrefs(raw: unknown): VoicePrefs | null {
  if (!raw || typeof raw !== 'object') return null;
  const voice = (raw as StaffAppPrefs).voice;
  if (!voice || typeof voice !== 'object') return null;
  return voice as VoicePrefs;
}

export function mergeVoicePrefs(base: VoicePrefs, patch: Partial<VoicePrefs>): VoicePrefs {
  return { ...base, ...patch };
}
