export const INK = '#0F0E1A';

export function hex(h: string): [number, number, number] {
  let s = (h || '#C5AC6A').replace('#', '');
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)) as [number, number, number];
}

/** Mezcla a con b; t = peso de a (0..1) */
export function mix(a: string, b: string, t: number): string {
  const A = hex(a), B = hex(b);
  return '#' + A.map((v, i) => Math.round(v * t + B[i] * (1 - t)).toString(16).padStart(2, '0')).join('');
}

export function luminance(h: string): number {
  return hex(h)
    .map((v) => v / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))
    .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
}

/** Color de texto con mejor contraste sobre el acento (tinta o blanco) */
export function onColor(accent: string): string {
  return luminance(accent) > 0.19 ? INK : '#FFFFFF';
}
