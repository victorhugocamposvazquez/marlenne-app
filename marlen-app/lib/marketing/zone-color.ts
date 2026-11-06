import { INK, mix, onColor } from '@/lib/marketing/color';
import type { StyleId, ZoneColors } from '@/lib/marketing/types';

export type { ZoneColors };

export interface ZoneInk {
  eyebrow: string;
  title: string;
  subtitle: string;
  price: string;
}

export interface CtaPaint {
  color: string;
  background?: string;
  border?: string;
  fontWeight?: number;
}

/** Solo #RGB o #RRGGBB. Si no vale, se ignora y queda el color del estilo. */
export function sanitizeHex(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(s);
  if (!m) return undefined;
  const hex = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return `#${hex.toUpperCase()}`;
}

export function zoneInk(style: StyleId, accent: string, colors?: ZoneColors | null): ZoneInk {
  const A = accent || '#D000A8';
  const accentText = mix(A, INK, 0.6);
  const onA = onColor(A);
  const base: Record<StyleId, ZoneInk> = {
    soft: { eyebrow: accentText, title: INK, subtitle: '#4A4957', price: INK },
    editorial: { eyebrow: INK, title: INK, subtitle: '#55534E', price: INK },
    promo: { eyebrow: onA, title: onA, subtitle: '#E4E3EA', price: A },
    minimal: { eyebrow: INK, title: INK, subtitle: '#5E5D6B', price: accentText },
    card: { eyebrow: accentText, title: INK, subtitle: '#5E5D6B', price: INK },
    luxe: { eyebrow: A, title: '#FFFFFF', subtitle: '#D2CFDA', price: A },
  };
  const d = base[style];
  const pick = (zone: keyof ZoneInk) => sanitizeHex(colors?.[zone]) || d[zone];
  return { eyebrow: pick('eyebrow'), title: pick('title'), subtitle: pick('subtitle'), price: pick('price') };
}

/** Botón relleno (soft, promo, card) o contorno / texto (minimal, luxe, editorial). */
export function ctaPaint(style: StyleId, accent: string, custom?: string | null): CtaPaint {
  const A = accent || '#D000A8';
  const onA = onColor(A);
  const chosen = sanitizeHex(custom);
  const filled = style === 'soft' || style === 'promo' || style === 'card';
  if (filled) {
    const bg = chosen || (style === 'soft' ? INK : A);
    return { background: bg, color: onColor(bg), fontWeight: style === 'soft' ? 600 : 700 };
  }
  if (style === 'editorial') {
    return { color: chosen || mix(A, INK, 0.6) };
  }
  const edge = chosen || (style === 'luxe' ? A : INK);
  const width = style === 'minimal' ? 4 : 3;
  return { color: edge, border: `${width}px solid ${edge}` };
}
