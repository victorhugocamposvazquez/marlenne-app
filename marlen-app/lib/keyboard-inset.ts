/** Hueco que tapa el teclado. En Android con resizes-content sale 0: la página ya se encogió. */

const KEYBOARD_MIN = 80;

export function keyboardBox(
  innerHeight: number,
  viewHeight: number,
  offsetTop: number,
  typing: boolean,
) {
  if (!typing) return { inset: 0, top: 0 };
  const top = Math.max(0, offsetTop);
  const inset = Math.max(0, innerHeight - viewHeight - top);
  if (inset < KEYBOARD_MIN) return { inset: 0, top: 0 };
  return { inset: Math.round(inset), top: Math.round(top) };
}
