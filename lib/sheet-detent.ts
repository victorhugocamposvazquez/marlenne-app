/** Alturas del formulario de alta, como los tope de Instagram. */

export const SHEET_PEEK = 0.3;
export const SHEET_MID = 0.5;
export const SHEET_TALL = 0.8;
export const SHEET_MIN_PX = 176;
export const SHEET_FLICK = 0.45;

export function sheetDetents(viewH: number): [number, number, number] {
  const h = Math.max(viewH, SHEET_MIN_PX + 96);
  const peek = Math.max(SHEET_MIN_PX, Math.round(h * SHEET_PEEK));
  const mid = Math.round(h * SHEET_MID);
  const tall = Math.round(h * SHEET_TALL);
  return [peek, Math.max(peek + 48, mid), Math.max(mid + 48, tall)];
}

/** Fuera de min/max el dedo sigue, pero frena (goma). */
export function rubberHeight(raw: number, min: number, max: number): number {
  if (raw < min) return min - (min - raw) * 0.28;
  if (raw > max) return max + (raw - max) * 0.28;
  return raw;
}

/**
 * Al soltar: si el dedo iba rápido, el siguiente tope en esa dirección.
 * Si no, el más cercano. velocity > 0 = dedo hacia abajo = más pequeño.
 */
export function snapSheetHeight(
  height: number,
  detents: number[],
  velocityPxPerMs: number,
  flick = SHEET_FLICK,
): number {
  const sorted = [...detents].filter(n => Number.isFinite(n)).sort((a, b) => a - b);
  if (sorted.length === 0) return height;

  if (velocityPxPerMs > flick) {
    const below = sorted.filter(d => d < height - 8);
    return below.length ? below[below.length - 1] : sorted[0];
  }
  if (velocityPxPerMs < -flick) {
    const above = sorted.filter(d => d > height + 8);
    return above.length ? above[0] : sorted[sorted.length - 1];
  }

  return sorted.reduce((best, d) =>
    Math.abs(d - height) < Math.abs(best - height) ? d : best,
  );
}

/** Toque corto en el asidero: un tope más alto, o vuelve al medio si ya está arriba. */
export function nextSheetHeight(height: number, detents: number[]): number {
  const sorted = [...detents].sort((a, b) => a - b);
  const taller = sorted.find(d => d > height + 12);
  return taller ?? (sorted[1] ?? sorted[0]);
}
