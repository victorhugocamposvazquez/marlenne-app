/** Agrupa inicios cada 15 min en huecos del día: un agujero, no una tira de chips. */

export type SlotGap = { first: number; last: number };

export function slotGaps(starts: number[], step = 15): SlotGap[] {
  const sorted = [...new Set(starts)].sort((a, b) => a - b);
  const gaps: SlotGap[] = [];
  for (const m of sorted) {
    const g = gaps[gaps.length - 1];
    if (g && m === g.last + step) g.last = m;
    else gaps.push({ first: m, last: m });
  }
  return gaps;
}

/** El toque dentro del hueco cae en un inicio válido. */
export function snapInGap(startMin: number, gap: SlotGap, step = 15) {
  const snapped = Math.round(startMin / step) * step;
  return Math.max(gap.first, Math.min(gap.last, snapped));
}
