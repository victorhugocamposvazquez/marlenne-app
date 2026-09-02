const hits = new Map<string, number[]>();

/** Tope por ventana. El parser y los clips no pasan por aquí. */
export function takeVoiceSlot(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const keep = (hits.get(key) ?? []).filter(t => now - t < windowMs);
  if (keep.length >= max) {
    hits.set(key, keep);
    return false;
  }
  keep.push(now);
  hits.set(key, keep);
  return true;
}

export const TTS_PER_MIN = 30;
export const LLM_PER_HOUR = 20;
