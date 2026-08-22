export type VoicePrefs = {
  hola: boolean;
  speak: boolean;
  micOnly: boolean;
};

export const VOICE_PREFS_EVENT = 'marlenne-voice-prefs';
const KEY = 'marlenne-voice';
const OLD = 'marlenne-wake';

const DEFAULTS: VoicePrefs = { hola: true, speak: true, micOnly: false };

export function getVoicePrefs(): VoicePrefs {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) as VoicePrefs };
    if (localStorage.getItem(OLD) === '0') return { ...DEFAULTS, hola: false };
  } catch { /* */ }
  return { ...DEFAULTS };
}

export function setVoicePrefs(patch: Partial<VoicePrefs>): VoicePrefs {
  const next = { ...getVoicePrefs(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* */ }
  window.dispatchEvent(new Event(VOICE_PREFS_EVENT));
  return next;
}

export function wakeWanted(p = getVoicePrefs()) {
  return p.hola && !p.micOnly;
}
