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

/** Al arrastrar la cita nueva, cae en el hueco libre más cercano. */
export function nearestStart(startMin: number, starts: number[]): number {
  if (starts.length === 0) return startMin;
  return starts.reduce((best, m) =>
    Math.abs(m - startMin) < Math.abs(best - startMin) ? m : best);
}

export type BusyRange = { start: number; end: number };

export function overlapsBusy(start: number, end: number, busy: BusyRange[]) {
  return busy.some(b => start < b.end && end > b.start);
}

/** Inicios cada `step` minutos donde cabe `durationMin` (o un paso si no se indica). */
export function freeStarts(
  busy: BusyRange[],
  {
    dayStart,
    dayEnd,
    durationMin,
    step = 15,
  }: {
    dayStart: number;
    dayEnd: number;
    durationMin?: number;
    step?: number;
  },
): number[] {
  const need = durationMin ?? step;
  const out: number[] = [];
  for (let t = dayStart; t + need <= dayEnd; t += step) {
    if (!overlapsBusy(t, t + need, busy)) out.push(t);
  }
  return out;
}
