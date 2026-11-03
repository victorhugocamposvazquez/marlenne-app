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

export type BookingThemeResolved = {
  accent: string;
  accentSoft: string;
  accentHover: string;
  ink: string;
  /** Texto sobre el accent (blanco o ink según contraste). */
  onAccent: string;
};

export function resolveBookingTheme(input: {
  accent?: string | null;
  accentSoft?: string | null;
  ink?: string | null;
} = {}): BookingThemeResolved {
  const accent = normalizeBookingHex(input.accent) ?? BOOKING_DEFAULT_ACCENT;
  const accentSoft = normalizeBookingHex(input.accentSoft) ?? deriveAccentSoft(accent);
  const ink = normalizeBookingHex(input.ink) ?? deriveBookingInk(accent);
  const onAccent =
    relativeLuminance(hexToRgb(accent)) > 0.55 ? ink : '#ffffff';
  return {
    accent,
    accentSoft,
    accentHover: darkenHex(accent, 0.12),
    ink,
    onAccent,
  };
}

export const BOOKING_PRESET_ACCENTS = [
  '#006bff',
  '#d000a8',
  '#0b6e4f',
  '#e85d4c',
  '#5b4fcf',
  '#0f766e',
  '#111111',
  '#f0c000',
] as const;

type Bucket = { count: number; r: number; g: number; b: number };

function isNearWhite(r: number, g: number, b: number): boolean {
  return Math.min(r, g, b) > 232 && Math.max(r, g, b) > 242;
}

function pushUnique(out: string[], hex: string, minDist: number): void {
  const n = normalizeBookingHex(hex);
  if (!n) return;
  if (out.some(h => colorDistance(h, n) < minDist)) return;
  out.push(n);
}

/** Extrae colores dominantes de una imagen (canvas). Incluye logos B/N. */
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
  // Fondo blanco: logos transparentes no quedan como negro opaco al muestrear.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const buckets = new Map<string, Bucket>();
  let darkPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 160) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isNearWhite(r, g, b)) continue;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (lum < 90) darkPixels += 1;
    // Cuantizar un poco más fino en negros (logos lineales).
    const qr = r >> 3;
    const qg = g >> 3;
    const qb = b >> 3;
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
      // Preferir cromáticos; los grises oscuros siguen valiendo en logos B/N.
      const score = b.count * (0.25 + chroma * 2.2 + (1 - hsl.l) * 0.35);
      return { rgb, score, chroma, count: b.count, l: hsl.l };
    })
    .sort((a, b) => b.score - a.score);

  const chromatic = ranked.filter(x => x.chroma > 0.06 && x.count >= 4);
  const out: string[] = [];

  for (const item of chromatic) {
    pushUnique(out, rgbToHex(item.rgb), 32);
    if (out.length >= maxColors) return out;
  }

  // Fallback mono: negros / grises del trazo (p. ej. logo solo negro sobre blanco).
  if (out.length === 0) {
    if (darkPixels >= 8) {
      pushUnique(out, '#111111', 28);
      pushUnique(out, '#333333', 28);
    }
    for (const item of ranked.filter(x => x.l < 0.55 && x.count >= 3)) {
      pushUnique(out, rgbToHex(item.rgb), 28);
      if (out.length >= Math.min(3, maxColors)) break;
    }
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

/** Solo colores muestreados del logo (sin complementarios inventados). */
export function buildLogoPalette(dominants: string[]): string[] {
  if (!dominants.length) return [];
  const best = [...dominants].sort((a, b) => {
    const sa = rgbToHsl(hexToRgb(a)).s;
    const sb = rgbToHsl(hexToRgb(b)).s;
    return sb - sa;
  })[0];
  const ordered = [best, ...dominants.filter(c => c !== best)];
  const out: string[] = [];
  for (const c of ordered) {
    const hex = normalizeBookingHex(c);
    if (!hex) continue;
    if (out.some(h => colorDistance(h, hex) < 28)) continue;
    out.push(hex);
    if (out.length >= 5) break;
  }
  return out;
}
