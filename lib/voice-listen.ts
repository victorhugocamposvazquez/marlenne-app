/**
 * Pausas del dictado. Sin DOM: Safari manda «final» al primer silencio;
 * hay que esperar a que terminen de hablar, no al primer corte.
 */

/** La frase parece a medias: «cita para», «a las», «con». */
export function looksIncomplete(text: string) {
  return /\b(?:y|e|o|u|a|al|a las?|con|para|de|del|el|la|las|los|un|una|unos|su|en|por|que|mejor)$/i
    .test(text.trim());
}

/** Cuánto esperar tras un «final» de Safari antes de dar la frase por cerrada. */
export function settleMs(text: string) {
  const t = text.trim();
  const words = t.split(/\s+/).filter(Boolean).length;
  if (looksIncomplete(t) || words >= 8) return 4200;
  if (words >= 4) return 3400;
  return 2600;
}

/** Hay una pregunta abierta: no volver al oído de «Hola Marlén». */
export function dialogOpen(state: { pending: unknown; confirm: unknown; hold: unknown }) {
  return !!(state.pending || state.confirm || state.hold);
}
