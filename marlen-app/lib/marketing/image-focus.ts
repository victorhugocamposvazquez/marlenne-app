/** Encuadre de la foto dentro del recorte (0–100, como object-position). */
export interface ImageFocus {
  x: number;
  y: number;
}

export const IMAGE_FOCUS_CENTER: ImageFocus = { x: 50, y: 50 };

function clamp(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)) * 10) / 10;
}

/**
 * El dedo mueve la foto: arrastrar a la derecha desplaza el encuadre hacia la izquierda de la imagen.
 */
export function panImageFocus(
  start: ImageFocus,
  dx: number,
  dy: number,
  width: number,
  height: number,
): ImageFocus {
  const w = width > 0 ? width : 1;
  const h = height > 0 ? height : 1;
  return {
    x: clamp(start.x - (dx / w) * 100),
    y: clamp(start.y - (dy / h) * 100),
  };
}

export function imageFocusOf(focus?: ImageFocus | null): ImageFocus {
  if (!focus) return IMAGE_FOCUS_CENTER;
  return { x: clamp(focus.x), y: clamp(focus.y) };
}
