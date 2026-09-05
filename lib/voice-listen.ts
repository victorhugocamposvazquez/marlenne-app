/**
 * Pausas del dictado. Sin DOM: Safari manda «final» al primer silencio;
 * hay que esperar a que terminen de hablar, no al primer corte.
 */

import { parseVoice } from '@/lib/voice';

/** Entre varias lecturas del dictado, la que es un comando de verdad. */
export function pickHeard(alts: string[]) {
  const clean = alts.map(a => a.trim()).filter(Boolean);
  if (clean.length <= 1) return clean[0] ?? '';
  let best = clean[0];
  let score = -1;
  for (const a of clean) {
    const kind = parseVoice(a).kind;
    const s = kind !== 'unknown' && kind !== 'chat' ? 3 : kind === 'chat' ? 1 : 0;
    if (s > score || (s === score && a.length > best.length)) {
      best = a;
      score = s;
    }
  }
  return best;
}

/** La frase parece a medias: «cita para», «a las», «con». */
export function looksIncomplete(text: string) {
  return /\b(?:y|e|o|u|a|al|a las?|con|para|de|del|el|la|las|los|un|una|unos|su|en|por|que|mejor)$/i
    .test(text.trim());
}

/** Cuánto esperar tras un «final» de Safari antes de dar la frase por cerrada. */
export function settleMs(text: string, mode: 'listen' | 'wake' = 'listen') {
  const t = text.trim();
  const words = t.split(/\s+/).filter(Boolean).length;
  if (looksIncomplete(t)) return 4200;
  if (mode === 'wake' && words <= 3) return 650;
  if (words >= 8) return 4200;
  if (words >= 5) return 3400;
  if (words <= 2) return 1000;
  return 2000;
}

/** Hay una pregunta abierta: no volver al oído de «Hola Marlén». */
export function dialogOpen(state: { pending: unknown; confirm: unknown; hold: unknown }) {
  return !!(state.pending || state.confirm || state.hold);
}
