/** Tema del widget de reserva. Sin DOM salvo extractFromImage (canvas). */

export const BOOKING_DEFAULT_ACCENT = '#006bff';
export const BOOKING_DEFAULT_INK = '#0b3558';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isBookingHex(value: string | null | undefined): value is string {
  return !!value && HEX_RE.test(value.trim());
}

export function normalizeBookingHex(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.trim();
  if (/^[0-9a-fA-F]{6}$/.test(s)) s = `#${s}`;
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    const r = s[1];
    const g = s[2];
    const b = s[3];
    s = `#${r}${r}${g}${g}${b}${b}`;
  }
  return isBookingHex(s) ? s.toLowerCase() : null;
}

type Rgb = { r: number; g: number; b: number };
type Hsl = { h: number; s: number; l: number };

function hexToRgb(hex: string): Rgb {
  const n = hex.slice(1);
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === R) h = ((G - B) / d + (G < B ? 6 : 0)) / 6;
  else if (max === G) h = ((B - R) / d + 2) / 6;
  else h = ((R - G) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  const H = ((h % 360) + 360) % 360;
  if (s === 0) {
    const v = l * 255;
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hk = H / 360;
  const t = (x: number) => {
    let n = x;
    if (n < 0) n += 1;
    if (n > 1) n -= 1;
    if (n < 1 / 6) return p + (q - p) * 6 * n;
    if (n < 1 / 2) return q;
    if (n < 2 / 3) return p + (q - p) * (2 / 3 - n) * 6;
    return p;
  };
  return { r: t(hk + 1 / 3) * 255, g: t(hk) * 255, b: t(hk - 1 / 3) * 255 };
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const lin = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function darkenHex(hex: string, amount = 0.12): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex({ r: r * (1 - amount), g: g * (1 - amount), b: b * (1 - amount) });
}

export function deriveAccentSoft(accent: string): string {
  const hsl = rgbToHsl(hexToRgb(accent));
  return rgbToHex(hslToRgb({ h: hsl.h, s: Math.min(0.55, hsl.s * 0.45 + 0.12), l: 0.92 }));
}

export function deriveBookingInk(accent: string): string {
  const hsl = rgbToHsl(hexToRgb(accent));
  const candidate = rgbToHex(hslToRgb({ h: hsl.h, s: Math.min(0.45, hsl.s * 0.55), l: 0.18 }));
  const white = { r: 255, g: 255, b: 255 };
  const contrast =
    (relativeLuminance(white) + 0.05) / (relativeLuminance(hexToRgb(candidate)) + 0.05);
  return contrast >= 4.5 ? candidate : BOOKING_DEFAULT_INK;
}

export function complementaryHex(accent: string): string {
  const hsl = rgbToHsl(hexToRgb(accent));
  return rgbToHex(hslToRgb({ h: hsl.h + 180, s: Math.min(0.7, hsl.s * 1.05), l: Math.min(0.52, Math.max(0.35, hsl.l)) }));
}

export type BookingThemeResolved = {
  accent: string;
  accentSoft: string;
  accentHover: string;
  ink: string;
};

export function resolveBookingTheme(input: {
  accent?: string | null;
  accentSoft?: string | null;
  ink?: string | null;
} = {}): BookingThemeResolved {
  const accent = normalizeBookingHex(input.accent) ?? BOOKING_DEFAULT_ACCENT;
  const accentSoft = normalizeBookingHex(input.accentSoft) ?? deriveAccentSoft(accent);
  const ink = normalizeBookingHex(input.ink) ?? deriveBookingInk(accent);
  return {
    accent,
    accentSoft,
    accentHover: darkenHex(accent, 0.12),
    ink,
  };
}

export const BOOKING_PRESET_ACCENTS = [
  '#006bff',
  '#d000a8',
  '#0b6e4f',
  '#e85d4c',
  '#5b4fcf',
  '#0f766e',
] as const;

type Bucket = { count: number; r: number; g: number; b: number };

/** Extrae 3–5 colores dominantes de una imagen (canvas). */
export async function extractColorsFromImage(
  imageUrl: string,
  maxColors = 5,
): Promise<string[]> {
  const img = await loadImage(imageUrl);
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const buckets = new Map<string, Bucket>();

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 200) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Ignorar casi blanco / casi negro
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max > 245 && min > 230) continue;
    if (max < 28) continue;
    const qr = r >> 4;
    const qg = g >> 4;
    const qb = b >> 4;
    const key = `${qr},${qg},${qb}`;
    const prev = buckets.get(key);
    if (prev) {
      prev.count += 1;
      prev.r += r;
      prev.g += g;
      prev.b += b;
    } else {
      buckets.set(key, { count: 1, r, g, b });
    }
  }

  const ranked = [...buckets.values()]
    .map(b => {
      const rgb = { r: b.r / b.count, g: b.g / b.count, b: b.b / b.count };
      const hsl = rgbToHsl(rgb);
      const chroma = hsl.s * (1 - Math.abs(hsl.l - 0.5) * 1.4);
      return { rgb, score: b.count * (0.35 + chroma), chroma, count: b.count };
    })
    .filter(x => x.chroma > 0.08 || x.count > 40)
    .sort((a, b) => b.score - a.score);

  const out: string[] = [];
  for (const item of ranked) {
    const hex = rgbToHex(item.rgb);
    if (out.some(h => colorDistance(h, hex) < 35)) continue;
    out.push(hex);
    if (out.length >= maxColors) break;
  }
  return out;
}

function colorDistance(a: string, b: string): number {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return Math.hypot(A.r - B.r, A.g - B.g, A.b - B.b);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar el logo'));
    img.src = url;
  });
}

/** Sugerencias: dominantes + complementario del más cromático. */
export function buildLogoPalette(dominants: string[]): string[] {
  if (!dominants.length) return [];
  const best = [...dominants].sort((a, b) => {
    const sa = rgbToHsl(hexToRgb(a)).s;
    const sb = rgbToHsl(hexToRgb(b)).s;
    return sb - sa;
  })[0];
  const comp = complementaryHex(best);
  const varied = rgbToHex(
    hslToRgb({
      ...rgbToHsl(hexToRgb(best)),
      l: Math.min(0.55, rgbToHsl(hexToRgb(best)).l + 0.08),
    }),
  );
  const merged = [best, ...dominants.filter(c => c !== best), comp, varied];
  const out: string[] = [];
  for (const c of merged) {
    const hex = normalizeBookingHex(c);
    if (!hex) continue;
    if (out.some(h => colorDistance(h, hex) < 28)) continue;
    out.push(hex);
    if (out.length >= 6) break;
  }
  return out;
}
