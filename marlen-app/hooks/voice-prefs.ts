export type VoicePrefs = {
  /** Oculta el micro flotante. */
  off: boolean;
  hola: boolean;
  speak: boolean;
  micOnly: boolean;
  cloud: boolean;
};

export const VOICE_PREFS_EVENT = 'marlenne-voice-prefs';
const KEY = 'marlenne-voice';
const OLD = 'marlenne-wake';

export const DEFAULT_VOICE_PREFS: VoicePrefs = {
  off: false,
  hola: true,
  speak: true,
  micOnly: false,
  cloud: true,
};

export function getVoicePrefs(): VoicePrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_VOICE_PREFS };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_VOICE_PREFS, ...JSON.parse(raw) as VoicePrefs };
    if (localStorage.getItem(OLD) === '0') return { ...DEFAULT_VOICE_PREFS, hola: false };
  } catch { /* */ }
  return { ...DEFAULT_VOICE_PREFS };
}

/** Servidor u otro dispositivo con la misma cuenta. */
export function applyServerVoicePrefs(server: Partial<VoicePrefs>) {
  const next = { ...DEFAULT_VOICE_PREFS, ...getVoicePrefs(), ...server };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* */ }
  window.dispatchEvent(new Event(VOICE_PREFS_EVENT));
}

export function setVoicePrefs(patch: Partial<VoicePrefs>): VoicePrefs {
  const next = { ...getVoicePrefs(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* */ }
  window.dispatchEvent(new Event(VOICE_PREFS_EVENT));
  return next;
}

export function wakeWanted(p = getVoicePrefs()) {
  return !p.off && p.hola && !p.micOnly;
}
