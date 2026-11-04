/** Dibujo canvas de creatividades. Solo se usa en cliente. */

import { FORMAT_SIZES, styleById } from '@/lib/marketing/styles';
import type {
  CreativePayload,
  MarketingBrand,
  MarketingFormat,
  MarketingStyleId,
} from '@/lib/marketing/types';

export type DrawInput = {
  styleId: MarketingStyleId;
  format: MarketingFormat;
  brand: MarketingBrand;
  payload: CreativePayload;
  logo?: HTMLImageElement | null;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(n)) return { r: 255, g: 36, b: 85 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function softAccent(accent: string, a = 0.18): string {
  const { r, g, b } = hexToRgb(accent);
  return `rgba(${r},${g},${b},${a})`;
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let cur = words[0]!;
  for (let i = 1; i < words.length; i++) {
    const next = `${cur} ${words[i]}`;
    if (ctx.measureText(next).width <= maxWidth) {
      cur = next;
    } else {
      lines.push(cur);
      cur = words[i]!;
      if (lines.length >= maxLines - 1) {
        const rest = [cur, ...words.slice(i + 1)].join(' ');
        let clipped = rest;
        while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
          clipped = clipped.slice(0, -1);
        }
        lines.push(`${clipped}…`);
        return lines;
      }
    }
  }
  lines.push(cur);
  return lines.slice(0, maxLines);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement | null | undefined,
  x: number,
  y: number,
  size: number,
) {
  if (!logo || !logo.naturalWidth) return;
  const scale = Math.min(size / logo.naturalWidth, size / logo.naturalHeight);
  const w = logo.naturalWidth * scale;
  const h = logo.naturalHeight * scale;
  ctx.save();
  roundRect(ctx, x, y, w, h, Math.min(16, size * 0.12));
  ctx.clip();
  ctx.drawImage(logo, x, y, w, h);
  ctx.restore();
}

function paintBg(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  styleId: MarketingStyleId,
  accent: string,
) {
  const { r, g, b } = hexToRgb(accent);
  if (styleId === 'soft_gradient') {
    const g1 = ctx.createLinearGradient(0, 0, w, h);
    g1.addColorStop(0, `rgb(${Math.min(255, r + 40)},${Math.max(0, g - 20)},${Math.min(255, b + 30)})`);
    g1.addColorStop(0.55, accent);
    g1.addColorStop(1, `rgb(${Math.max(0, r - 40)},${Math.max(0, g)},${Math.min(255, b + 80)})`);
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (styleId === 'luxe_dark') {
    const g1 = ctx.createLinearGradient(0, 0, w * 0.2, h);
    g1.addColorStop(0, '#1a1824');
    g1.addColorStop(1, '#0F0E1A');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = softAccent(accent, 0.22);
    ctx.beginPath();
    ctx.arc(w * 0.85, h * 0.12, w * 0.35, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (styleId === 'bold_promo') {
    ctx.fillStyle = '#0F0E1A';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, w, h * 0.42);
    return;
  }
  if (styleId === 'story_card') {
    const g1 = ctx.createLinearGradient(0, 0, w, h);
    g1.addColorStop(0, '#FFF0F8');
    g1.addColorStop(1, '#E8F2FF');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (styleId === 'editorial') {
    ctx.fillStyle = '#F7F7FA';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = softAccent(accent, 0.12);
    ctx.fillRect(0, 0, w, h * 0.28);
    return;
  }
  // minimal_ink
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = softAccent(accent, 0.1);
  ctx.fillRect(0, h * 0.72, w, h * 0.28);
}

export function drawCreative(
  ctx: CanvasRenderingContext2D,
  input: DrawInput,
): void {
  const { w, h } = FORMAT_SIZES[input.format];
  const style = styleById(input.styleId);
  const accent = input.brand.accent || '#ff2455';
  const dark = style.dark || input.styleId === 'soft_gradient' || input.styleId === 'bold_promo';
  const ink = dark ? '#FFFFFF' : '#0F0E1A';
  const muted = dark ? 'rgba(255,255,255,0.78)' : 'rgba(15,14,26,0.62)';
  const pad = Math.round(w * 0.078);
  const p = input.payload;

  ctx.clearRect(0, 0, w, h);
  paintBg(ctx, w, h, input.styleId, accent);

  if (input.styleId === 'story_card') {
    const inset = Math.round(w * 0.055);
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, inset, inset, w - inset * 2, h - inset * 2, 48);
    ctx.fill();
    ctx.strokeStyle = softAccent(accent, 0.35);
    ctx.lineWidth = 4;
    roundRect(ctx, inset, inset, w - inset * 2, h - inset * 2, 48);
    ctx.stroke();
  }

  const topY = input.styleId === 'story_card' ? pad + 36 : pad;
  drawLogo(ctx, input.logo, pad, topY, Math.round(w * 0.16));

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  let y = topY + Math.round(w * 0.2);
  if (p.kicker) {
    ctx.fillStyle = input.styleId === 'bold_promo' && y < h * 0.4 ? '#FFFFFF' : (dark ? muted : accent);
    ctx.font = `600 ${Math.round(w * 0.038)}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(p.kicker.toUpperCase(), pad, y);
    y += Math.round(w * 0.07);
  }

  const headlineColor =
    input.styleId === 'bold_promo' && y < h * 0.42 ? '#FFFFFF' : ink;
  ctx.fillStyle = headlineColor;
  const hlSize = input.styleId === 'editorial' ? Math.round(w * 0.11) : Math.round(w * 0.095);
  ctx.font = `800 ${hlSize}px system-ui, -apple-system, sans-serif`;
  const hlLines = wrapLines(ctx, p.headline || ' ', w - pad * 2, 3);
  for (const line of hlLines) {
    ctx.fillText(line, pad, y);
    y += Math.round(hlSize * 1.12);
  }

  if (p.subline) {
    y += Math.round(w * 0.035);
    ctx.fillStyle = muted;
    ctx.font = `500 ${Math.round(w * 0.042)}px system-ui, -apple-system, sans-serif`;
    for (const line of wrapLines(ctx, p.subline, w - pad * 2, 2)) {
      ctx.fillText(line, pad, y);
      y += Math.round(w * 0.055);
    }
  }

  if (p.priceLabel) {
    const priceY =
      input.styleId === 'bold_promo'
        ? Math.round(h * 0.52)
        : Math.max(y + Math.round(w * 0.06), Math.round(h * 0.48));
    ctx.fillStyle = input.styleId === 'bold_promo' ? accent : ink;
    const pz =
      input.styleId === 'bold_promo' || input.styleId === 'luxe_dark'
        ? Math.round(w * 0.16)
        : Math.round(w * 0.12);
    ctx.font = `800 ${pz}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(p.priceLabel, pad, priceY);
  }

  // CTA pill
  const cta = (p.ctaLabel || 'Reservar').trim();
  ctx.font = `700 ${Math.round(w * 0.04)}px system-ui, -apple-system, sans-serif`;
  const ctaPadX = Math.round(w * 0.055);
  const ctaH = Math.round(w * 0.12);
  const ctaW = Math.min(w - pad * 2, ctx.measureText(cta).width + ctaPadX * 2);
  const ctaY = h - pad - ctaH - Math.round(w * 0.04);
  const ctaBg = dark && input.styleId !== 'soft_gradient' ? '#FFFFFF' : accent;
  const ctaFg = dark && input.styleId !== 'soft_gradient' ? '#0F0E1A' : '#FFFFFF';
  if (input.styleId === 'soft_gradient') {
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    roundRect(ctx, pad, ctaY, ctaW, ctaH, ctaH / 2);
    ctx.fill();
    ctx.fillStyle = '#0F0E1A';
  } else {
    ctx.fillStyle = ctaBg;
    roundRect(ctx, pad, ctaY, ctaW, ctaH, ctaH / 2);
    ctx.fill();
    ctx.fillStyle = ctaFg;
  }
  ctx.textBaseline = 'middle';
  ctx.fillText(cta, pad + ctaPadX, ctaY + ctaH / 2);

  // Brand footer
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = muted;
  ctx.font = `600 ${Math.round(w * 0.032)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText(input.brand.salonName || 'marlén', w - pad, h - pad + Math.round(w * 0.01));
}

export function exportCreativePng(input: DrawInput): Promise<Blob> {
  const { w, h } = FORMAT_SIZES[input.format];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas no disponible'));
  drawCreative(ctx, input);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('No se pudo exportar PNG'))),
      'image/png',
    );
  });
}
