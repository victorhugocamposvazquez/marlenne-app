'use client';

import React from 'react';
import type { CreativeConfig, CreativeImage } from '@/lib/marketing/types';
import { FORMAT_H } from '@/lib/marketing/data';
import { INK, mix, onColor } from '@/lib/marketing/color';

/**
 * Render de una creatividad a 1080 px de ancho (coordenadas de exportación).
 * - <CreativeCanvas> pinta a tamaño real (se usa para exportar PNG).
 * - <Creative> lo escala a `width` para previews y miniaturas.
 * Todos los elementos de diseño se anclan solos según estilo, formato e imagen.
 */

const SANS = 'var(--font-sora), system-ui, sans-serif';
const SERIF = 'var(--font-serif), Georgia, serif';
const balance = { textWrap: 'balance' } as React.CSSProperties;

const KS = {
  story: { t: 128, pr: 190, pt: 210, px: 96, pb: 260, lg: 150, serif: 1.45, wedge: 180, outer: [170, 64, 220], cpad: '96px 72px', cpadI: '56px 72px 72px', band: 860, inset: 620, cardImg: 600, seal: 250 },
  square: { t: 100, pr: 140, pt: 84, px: 84, pb: 84, lg: 110, serif: 1.3, wedge: 90, outer: [56, 56, 56], cpad: '60px 64px', cpadI: '36px 56px 44px', band: 360, inset: 220, cardImg: 280, seal: 190 },
  portrait: { t: 112, pr: 160, pt: 96, px: 92, pb: 96, lg: 130, serif: 1.38, wedge: 120, outer: [64, 64, 64], cpad: '72px 64px', cpadI: '44px 56px 56px', band: 540, inset: 380, cardImg: 400, seal: 220 },
} as const;

export function computeLayout(c: CreativeConfig) {
  const A = c.accent, fmt = c.format, st = c.style, img = c.image, E = c.elements;
  const K = KS[fmt];
  const H = FORMAT_H[fmt];
  const hasImg = !!img;
  const inline = hasImg && ['soft', 'editorial', 'minimal', 'card'].includes(st);
  const F = inline ? 0.8 : 1;
  const title = (c.title || '').trim(), price = (c.price || '').trim();
  const Lw = Math.max(1, ...title.split(/\s+/).map((x) => x.length));
  const lenF = Math.min(1, Math.max(0.6, 30 / Math.max(1, title.length)));
  const avail = 1080 - K.px * 2;
  const availCard = 1080 - 2 * K.outer[1] - 2 * parseInt(K.cpad.split(' ').pop() as string);
  const fit = (base: number, av: number, k: number) => Math.round(Math.min(base * lenF * F, av / (Lw * k)));
  const pfRaw = Math.max(0.5, Math.min(1, 6 / Math.max(1, price.length)));
  const pf = pfRaw * F;
  const showLogo = !!c.showLogo && !!c.logo;
  const onA = onColor(A);
  const seal = E.seal && !!(E.sealText || '').trim();
  const sealA = seal && !inline && ['soft', 'editorial', 'minimal'].includes(st);
  const sealS = Math.round(K.seal * (inline ? 0.9 : 1));
  const sealLen = (E.sealText || '').trim().length;
  const sealFsFor = (size: number) => Math.round(size * (sealLen <= 4 ? 0.26 : sealLen <= 8 ? 0.18 : 0.145));
  const frame: Record<string, [number, number, string, number]> = {
    soft: [36, 3, A, 48], editorial: [36, 2, INK, 0], promo: [36, 3, 'rgba(255,255,255,0.6)', 24], minimal: [36, 3, INK, 0], card: [24, 3, A, 84], luxe: [64, 1, mix(A, '#121018', 0.45), 6],
  };
  return {
    K, H, title, price, A, onA, img, st, fmt,
    accentText: mix(A, INK, 0.6),
    tint35: mix(A, '#FFFFFF', 0.35), tint55: mix(A, '#FFFFFF', 0.5),
    softBg: `radial-gradient(70% 45% at 92% 6%, ${mix(A, '#FFFFFF', 0.45)} 0%, rgba(255,255,255,0) 70%), linear-gradient(165deg, ${mix(A, '#FFFFFF', 0.28)} 0%, ${mix(A, '#FFFFFF', 0.08)} 55%, #FFFFFF 100%)`,
    cardBg: `linear-gradient(170deg, ${mix(A, '#FFFFFF', 0.32)} 0%, ${mix(A, '#FFFFFF', 0.12)} 100%)`,
    luxeBg: `radial-gradient(110% 55% at 50% 108%, ${mix(A, '#121018', 0.38)} 0%, #121018 62%)`,
    luxeLine: mix(A, '#121018', 0.55),
    hasEyebrow: !!(c.eyebrow || '').trim(), hasSubtitle: !!(c.subtitle || '').trim(), hasPrice: !!price, hasCta: !!(c.cta || '').trim(),
    showLogo, showLogoTop: showLogo && !hasImg, showLogoBadge: showLogo && hasImg,
    hasImg, imgPh: hasImg && !img?.src,
    showLink: !(hasImg && fmt === 'square'),
    linkShort: (c.link || '').replace(/^https?:\/\//, '').replace(/\/$/, ''),
    pad: `${K.pt}px ${K.px}px ${K.pb}px`,
    padC: hasImg ? `56px ${K.px}px ${K.pb}px` : `${K.pt}px ${K.px}px ${K.pb}px`,
    promoTop: `${K.pt}px ${K.px}px 40px`, promoBot: `24px ${K.px}px ${K.pb}px`,
    edMid: hasImg ? '28px 0' : '48px 0',
    capTop: fmt === 'story' ? 280 : 36,
    tSize: fit(K.t, avail, 0.6), minT: fit(K.t * 1.08, avail, 0.6), cardT: fit(K.t * 0.86, availCard, 0.6),
    promoT: Math.round(Math.min(K.t * lenF, avail / (Lw * 0.63))), serifT: fit(K.t * K.serif, avail, 0.46),
    prSize: Math.round(K.pr * pf), serifPr: Math.round(K.pr * 0.8 * pf), cardPr: Math.round(K.pr * 0.62 * pf),
    promoPr: Math.round(K.pr * (fmt === 'square' ? 1.3 : 1.45) * pfRaw),
    // elementos
    shape: !!E.shape, frame: E.frame ? frame[st] : null, ul: !!E.underline,
    sealText: E.sealText,
    sealImg: seal && inline, sealA, sealCard: seal && !inline && st === 'card', sealPromo: seal && st === 'promo', sealLuxe: seal && st === 'luxe',
    sealS, sealFs: sealFsFor(sealS), luxeSealS: Math.round(sealS * 0.85), luxeSealFs: sealFsFor(Math.round(sealS * 0.85)),
    sealRing: onA === INK ? 'rgba(15,14,26,0.32)' : 'rgba(255,255,255,0.5)',
    sealPromoTop: -Math.round(sealS * 0.62 + K.wedge * 0.4),
    sealCardTop: K.outer[0] - Math.round(sealS * 0.35), sealCardRight: K.outer[1] - Math.round(sealS * 0.25),
    luxeSealRight: fmt === 'story' ? 60 : 56, luxeSealBottom: fmt === 'story' ? 300 : 92,
    sparkA: !!E.sparkles && !sealA, sparkL: !!E.sparkles && sealA, sparkC: st === 'promo' ? onA : A,
    ulW: Math.round(Math.min(avail * 0.62, 600)), ulC: st === 'promo' ? onA : A,
    ringC: onA === INK ? 'rgba(15,14,26,0.09)' : 'rgba(255,255,255,0.2)',
    edShapeTop: fmt === 'story' ? 820 : fmt === 'portrait' ? 460 : 300,
    minShapeTop: fmt === 'story' ? -60 : -150, cardShapeTop: fmt === 'story' ? 120 : 20,
    promoPh: hasImg && !img?.src && fmt !== 'square',
    luxePhTop: fmt === 'story' ? 280 : 80,
  };
}
type L = ReturnType<typeof computeLayout>;

/* ---------- piezas ---------- */

function ImageFill({ img }: { img: CreativeImage }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: img.bg || '#E4E3EA' }}>
      {img.src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img.src} alt="" crossOrigin="anonymous" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
    </div>
  );
}

function Caption({ label, style, bg = 'rgba(15,14,26,0.32)' }: { label: string; style: React.CSSProperties; bg?: string }) {
  return <span style={{ position: 'absolute', fontSize: 26, fontWeight: 600, color: '#FFFFFF', background: bg, padding: '10px 22px', borderRadius: 999, ...style }}>Foto · {label}</span>;
}

function Logo({ src, size, radius, style }: { src?: string; size: number; radius: number | string; style?: React.CSSProperties }) {
  if (!src) return null;
  // crossOrigin: hace falta para html-to-image (PNG). Mismo origen / Supabase público con CORS.
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt=""
      crossOrigin={src.startsWith('blob:') || src.startsWith('data:') ? undefined : 'anonymous'}
      style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', flexShrink: 0, ...style }}
    />
  );
}

function Seal({ text, size, fs, bg, color, ring, style, weight = 800, shadow = '0 14px 34px rgba(15,14,26,0.2)' }: {
  text: string; size: number; fs: number; bg: string; color: string; ring: string; style: React.CSSProperties; weight?: number; shadow?: string;
}) {
  return (
    <div style={{ position: 'absolute', width: size, height: size, borderRadius: '50%', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', transform: 'rotate(-10deg)', boxShadow: shadow, zIndex: 4, ...style }}>
      <div style={{ position: 'absolute', inset: 12, borderRadius: '50%', border: `3px dashed ${ring}` }} />
      <span style={{ position: 'relative', fontSize: fs, fontWeight: weight, lineHeight: 1.02, letterSpacing: '-0.02em', padding: '0 34px', ...balance }}>{text}</span>
    </div>
  );
}

const SPARKS = [
  'M120 8C124 46 134 56 172 60C134 64 124 74 120 112C116 74 106 64 68 60C106 56 116 46 120 8Z',
  'M48 92C50 112 56 118 76 120C56 122 50 128 48 148C46 128 40 122 20 120C40 118 46 112 48 92Z',
  'M178 116C179 127 182 130 193 131C182 132 179 135 178 146C177 135 174 132 163 131C174 130 177 127 178 116Z',
];
function Sparkles({ w = 200, color, style, two = false }: { w?: number; color: string; style: React.CSSProperties; two?: boolean }) {
  return (
    <svg width={w} height={Math.round(w * 0.85)} viewBox="0 0 200 170" fill="currentColor" style={{ position: 'absolute', color, zIndex: 3, pointerEvents: 'none', ...style }}>
      {(two ? SPARKS.slice(0, 2) : SPARKS).map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

function Underline({ width, color, mt, align = 'flex-start', sw = 14, h = 34 }: { width: number; color: string; mt: number; align?: 'flex-start' | 'center'; sw?: number; h?: number }) {
  return (
    <svg viewBox="0 0 600 40" preserveAspectRatio="none" fill="none" stroke="currentColor" style={{ display: 'block', width, height: h, marginTop: mt, alignSelf: align, color }}>
      <path d="M6 28C140 8 300 6 440 16S570 30 594 12" style={{ strokeWidth: sw, strokeLinecap: 'round', vectorEffect: 'non-scaling-stroke' }} />
    </svg>
  );
}

const Pill = ({ children, style }: { children: React.ReactNode; style: React.CSSProperties }) => (
  <div style={{ height: 124, padding: '0 64px', borderRadius: 999, fontSize: 42, fontWeight: 600, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', ...style }}>{children}</div>
);

/* ---------- estilos ---------- */

function Soft({ c, v }: { c: CreativeConfig; v: L }) {
  const sealProps = { text: v.sealText, size: v.sealS, fs: v.sealFs, bg: v.A, color: v.onA, ring: v.sealRing };
  return (
    <div style={{ position: 'absolute', inset: 0, background: v.softBg, display: 'flex', flexDirection: 'column', isolation: 'isolate' }}>
      {v.shape && <div style={{ position: 'absolute', zIndex: -1, right: -220, bottom: -220, width: 780, height: 780, borderRadius: '50%', background: v.tint35 }} />}
      {v.img && (
        <div style={{ position: 'relative', height: v.K.band, flexShrink: 0, overflow: 'hidden' }}>
          <ImageFill img={v.img} />
          {v.imgPh && <Caption label={v.img.label} style={{ right: 40, top: v.capTop }} />}
          {v.showLogoBadge && <Logo src={c.logo} size={120} radius={28} style={{ position: 'absolute', left: v.K.px, bottom: 40, boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }} />}
          {v.sealImg && <Seal {...sealProps} style={{ right: 56, bottom: 48 }} shadow="0 14px 34px rgba(15,14,26,0.22)" />}
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 32, padding: v.padC }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {v.showLogoTop && <Logo src={c.logo} size={120} radius={28} />}
          {v.hasEyebrow && <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: v.accentText }}>{c.eyebrow}</div>}
        </div>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 32 }}>
          {v.sealA && <Seal {...sealProps} style={{ right: 0, bottom: 'calc(100% + 20px)' }} />}
          {v.sparkA && <Sparkles color={v.sparkC} style={{ right: 8, bottom: 'calc(100% + 8px)' }} />}
          {v.sparkL && <Sparkles w={160} two color={v.sparkC} style={{ left: -20, bottom: 'calc(100% + 4px)' }} />}
          <div style={{ fontSize: v.tSize, fontWeight: 700, lineHeight: 1.02, letterSpacing: '-0.035em', ...balance }}>{v.title}</div>
          {v.ul && <Underline width={v.ulW} color={v.ulC} mt={-22} />}
          {v.hasSubtitle && <div style={{ fontSize: 44, lineHeight: 1.35, color: '#4A4957', maxWidth: 840 }}>{c.subtitle}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', gap: 40 }}>
            {v.hasPrice && <div style={{ flex: 1, fontSize: v.prSize, fontWeight: 700, letterSpacing: '-0.045em', lineHeight: 0.9, whiteSpace: 'nowrap' }}>{v.price}</div>}
            {v.hasCta && <Pill style={{ background: INK, color: '#FFFFFF' }}>{c.cta}</Pill>}
          </div>
          {v.showLink && <div style={{ fontSize: 30, color: '#4A4957' }}>{v.linkShort}</div>}
        </div>
      </div>
    </div>
  );
}

function Editorial({ c, v }: { c: CreativeConfig; v: L }) {
  const sealProps = { text: v.sealText, size: v.sealS, fs: v.sealFs, bg: v.A, color: v.onA, ring: v.sealRing };
  const serif = { fontFamily: SERIF };
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#F6F3ED', display: 'flex', flexDirection: 'column', padding: v.pad, isolation: 'isolate' }}>
      {v.shape && <div style={{ position: 'absolute', zIndex: -1, right: -240, top: v.edShapeTop, width: 780, height: 780, borderRadius: '50%', border: `3px solid ${v.A}` }} />}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, paddingBottom: 32, borderBottom: `3px solid ${INK}`, minHeight: 120 }}>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{c.eyebrow}</div>
        {v.showLogo && <Logo src={c.logo} size={88} radius="50%" />}
      </div>
      {v.img && (
        <div style={{ position: 'relative', height: v.K.inset, marginTop: 40, flexShrink: 0, overflow: 'hidden' }}>
          <ImageFill img={v.img} />
          {v.imgPh && <Caption label={v.img.label} style={{ right: 32, top: 32 }} />}
          {v.sealImg && <Seal {...sealProps} style={{ right: 40, bottom: 40 }} shadow="0 14px 34px rgba(15,14,26,0.22)" />}
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: v.edMid }}>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 32 }}>
          {v.sealA && <Seal {...sealProps} style={{ right: 0, bottom: 'calc(100% + 16px)' }} />}
          {v.sparkA && <Sparkles color={v.sparkC} style={{ right: 8, bottom: 'calc(100% + 4px)' }} />}
          {v.sparkL && <Sparkles w={160} two color={v.sparkC} style={{ left: -20, bottom: 'calc(100% + 4px)' }} />}
          <div style={{ ...serif, fontSize: v.serifT, lineHeight: 0.95, letterSpacing: '-0.01em', ...balance }}>{v.title}</div>
          {v.ul && <Underline width={v.ulW} color={v.ulC} mt={-20} sw={12} />}
          {v.hasSubtitle && <div style={{ fontSize: 40, lineHeight: 1.4, color: '#55534E', maxWidth: 780 }}>{c.subtitle}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 40, paddingTop: 32, borderTop: `3px solid ${INK}` }}>
        {v.hasPrice && <div style={{ ...serif, fontSize: v.serifPr, lineHeight: 0.9, whiteSpace: 'nowrap' }}>{v.price}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 14, marginLeft: 'auto', textAlign: 'right' }}>
          {v.hasCta && (
            <div style={{ fontSize: 40, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 16, color: v.accentText }}>
              {c.cta}
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </div>
          )}
          {v.showLink && <div style={{ fontSize: 28, color: '#55534E' }}>{v.linkShort}</div>}
        </div>
      </div>
    </div>
  );
}

function Promo({ c, v }: { c: CreativeConfig; v: L }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: INK, color: '#FFFFFF' }}>
      {v.img && (
        <>
          <ImageFill img={v.img} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,14,26,0.35) 0%, rgba(15,14,26,0.55) 45%, rgba(15,14,26,0.92) 100%)' }} />
        </>
      )}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'relative', isolation: 'isolate', overflow: 'hidden', background: v.A, color: v.onA, padding: v.promoTop, display: 'flex', flexDirection: 'column', gap: 32 }}>
          {v.shape && <div style={{ position: 'absolute', zIndex: -1, right: -170, top: -170, width: 580, height: 580, borderRadius: '50%', border: `48px solid ${v.ringC}` }} />}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            {v.hasEyebrow && <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '14px 30px', border: '4px solid currentColor', borderRadius: 999 }}>{c.eyebrow}</div>}
            {v.showLogo && <Logo src={c.logo} size={104} radius={24} style={{ marginLeft: 'auto' }} />}
          </div>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 32 }}>
            {v.sparkA && <Sparkles w={180} color={v.sparkC} style={{ right: 0, top: -40 }} />}
            <div style={{ fontSize: v.promoT, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.045em', maxWidth: 860, ...balance }}>{v.title}</div>
            {v.ul && <Underline width={v.ulW} color={v.ulC} mt={-22} />}
          </div>
        </div>
        <div style={{ height: v.K.wedge, background: v.A, clipPath: 'polygon(0 0, 100% 0, 0 100%)', flexShrink: 0 }} />
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 40, padding: v.promoBot }}>
          {v.sealPromo && <Seal text={v.sealText} size={v.sealS} fs={v.sealFs} bg="#FFFFFF" color={INK} ring="rgba(15,14,26,0.3)" shadow="0 14px 34px rgba(0,0,0,0.3)" style={{ right: v.K.px, top: v.sealPromoTop }} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {v.promoPh && v.img && <span style={{ alignSelf: 'flex-start', fontSize: 26, fontWeight: 600, color: '#FFFFFF', background: 'rgba(15,14,26,0.45)', padding: '10px 22px', borderRadius: 999 }}>Foto · {v.img.label}</span>}
            {v.hasPrice && <div style={{ fontSize: v.promoPr, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 0.85, color: v.A, whiteSpace: 'nowrap' }}>{v.price}</div>}
            {v.hasSubtitle && <div style={{ fontSize: 44, lineHeight: 1.3, color: '#E4E3EA', maxWidth: 860 }}>{c.subtitle}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32 }}>
            {v.hasCta && <Pill style={{ background: v.A, color: v.onA, fontWeight: 700 }}>{c.cta}</Pill>}
            {v.showLink && <div style={{ fontSize: 30, color: '#C9C8D3' }}>{v.linkShort}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Minimal({ c, v }: { c: CreativeConfig; v: L }) {
  const sealProps = { text: v.sealText, size: v.sealS, fs: v.sealFs, bg: v.A, color: v.onA, ring: v.sealRing };
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#FFFFFF', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 40, padding: v.pad, isolation: 'isolate' }}>
      {v.shape && <div style={{ position: 'absolute', zIndex: -1, right: -140, top: v.minShapeTop, width: 440, height: 440, borderRadius: '50%', background: v.tint55 }} />}
      {v.img && (
        <div style={{ position: 'relative', height: v.K.inset, flexShrink: 0, overflow: 'hidden', borderRadius: 8 }}>
          <ImageFill img={v.img} />
          {v.imgPh && <Caption label={v.img.label} style={{ right: 32, top: 32 }} />}
          {v.sealImg && <Seal {...sealProps} style={{ right: 40, bottom: 40 }} shadow="0 14px 34px rgba(15,14,26,0.22)" />}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: v.A, flexShrink: 0 }} />
        <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '0.02em' }}>{c.eyebrow}</div>
      </div>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 32 }}>
        {v.sealA && <Seal {...sealProps} style={{ right: 0, bottom: 'calc(100% + 12px)' }} />}
        {v.sparkA && <Sparkles color={v.sparkC} style={{ right: 8, bottom: 'calc(100% + 4px)' }} />}
        {v.sparkL && <Sparkles w={160} two color={v.sparkC} style={{ left: -20, bottom: 'calc(100% + 4px)' }} />}
        <div style={{ fontSize: v.minT, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.05em', ...balance }}>{v.title}</div>
        {v.ul && <Underline width={v.ulW} color={v.ulC} mt={-20} />}
        {v.hasSubtitle && <div style={{ fontSize: 44, lineHeight: 1.35, color: '#5E5D6B', maxWidth: 820 }}>{c.subtitle}</div>}
        {v.hasPrice && <div style={{ fontSize: 72, fontWeight: 600, letterSpacing: '-0.03em', color: v.accentText }}>{v.price}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>
        {v.hasCta && <div style={{ height: 116, padding: '0 56px', border: `4px solid ${INK}`, borderRadius: 999, fontSize: 40, fontWeight: 600, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{c.cta}</div>}
        {v.showLogo && <Logo src={c.logo} size={96} radius={22} style={{ marginLeft: 'auto' }} />}
      </div>
    </div>
  );
}

function Card({ c, v }: { c: CreativeConfig; v: L }) {
  const sealProps = { text: v.sealText, size: v.sealS, fs: v.sealFs, bg: v.A, color: v.onA, ring: v.sealRing };
  const o = v.K.outer;
  return (
    <div style={{ position: 'absolute', inset: 0, background: v.cardBg, padding: `${o[0]}px ${o[1]}px ${o[2]}px`, display: 'flex', isolation: 'isolate' }}>
      {v.shape && (
        <>
          <div style={{ position: 'absolute', zIndex: -1, left: -200, bottom: -200, width: 700, height: 700, borderRadius: '50%', background: v.tint55 }} />
          <div style={{ position: 'absolute', zIndex: -1, right: -90, top: v.cardShapeTop, width: 260, height: 260, borderRadius: '50%', background: v.tint55 }} />
        </>
      )}
      {v.sealCard && <Seal {...sealProps} style={{ right: v.sealCardRight, top: v.sealCardTop }} />}
      <div style={{ flex: 1, background: '#FFFFFF', borderRadius: 64, boxShadow: '0 40px 100px rgba(15,14,26,0.12)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {v.img && (
          <div style={{ position: 'relative', height: v.K.cardImg, flexShrink: 0, overflow: 'hidden' }}>
            <ImageFill img={v.img} />
            {v.imgPh && <Caption label={v.img.label} style={{ left: 36, top: 36 }} />}
            {v.showLogoBadge && <Logo src={c.logo} size={120} radius={30} style={{ position: 'absolute', left: '50%', bottom: 36, marginLeft: -60, boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }} />}
            {v.sealImg && <Seal {...sealProps} style={{ right: 40, bottom: 40 }} shadow="0 14px 34px rgba(15,14,26,0.22)" />}
          </div>
        )}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: 24, textAlign: 'center', padding: v.hasImg ? v.K.cpadI : v.K.cpad }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
            {v.showLogoTop && <Logo src={c.logo} size={v.K.lg} radius={36} />}
            {v.hasEyebrow && <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: v.accentText }}>{c.eyebrow}</div>}
          </div>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
            {v.sparkA && <Sparkles w={150} color={v.sparkC} style={{ right: -40, top: -96 }} />}
            <div style={{ fontSize: v.cardT, fontWeight: 700, lineHeight: 1.04, letterSpacing: '-0.035em', ...balance }}>{v.title}</div>
            {v.ul && <Underline width={v.ulW} color={v.ulC} mt={-18} align="center" sw={12} h={30} />}
            {v.hasSubtitle && <div style={{ fontSize: 42, lineHeight: 1.35, color: '#5E5D6B', maxWidth: 760 }}>{c.subtitle}</div>}
            {v.hasPrice && <div style={{ fontSize: v.cardPr, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, whiteSpace: 'nowrap' }}>{v.price}</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
            {v.hasCta && <Pill style={{ background: v.A, color: v.onA, fontWeight: 700 }}>{c.cta}</Pill>}
            {v.showLink && <div style={{ fontSize: 28, color: '#5E5D6B' }}>{v.linkShort}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Luxe({ c, v }: { c: CreativeConfig; v: L }) {
  const serif = { fontFamily: SERIF };
  return (
    <div style={{ position: 'absolute', inset: 0, background: v.luxeBg, color: '#FFFFFF' }}>
      {v.img && (
        <>
          <ImageFill img={v.img} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(18,16,24,0.72) 0%, rgba(18,16,24,0.5) 40%, rgba(18,16,24,0.9) 100%)' }} />
          {v.imgPh && <Caption label={v.img.label} bg="rgba(18,16,24,0.45)" style={{ left: 96, top: v.luxePhTop }} />}
        </>
      )}
      {v.shape && (
        <>
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: 840, height: 840, margin: '-420px 0 0 -420px', borderRadius: '50%', border: `2px solid ${v.luxeLine}` }} />
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: 700, height: 700, margin: '-350px 0 0 -350px', borderRadius: '50%', border: `2px solid ${v.luxeLine}`, opacity: 0.6 }} />
        </>
      )}
      <div style={{ position: 'absolute', inset: 44, border: `2px solid ${v.luxeLine}`, borderRadius: 10 }} />
      {v.sealLuxe && <Seal text={v.sealText} size={v.luxeSealS} fs={v.luxeSealFs} bg={v.A} color={v.onA} ring={v.sealRing} weight={700} shadow="0 14px 34px rgba(0,0,0,0.35)" style={{ right: v.luxeSealRight, bottom: v.luxeSealBottom }} />}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', textAlign: 'center', padding: v.pad }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
          {v.showLogo && <Logo src={c.logo} size={v.K.lg} radius="50%" />}
          {v.hasEyebrow && <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: '0.32em', textTransform: 'uppercase', color: v.A }}>{c.eyebrow}</div>}
        </div>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36 }}>
          {v.sparkA && <Sparkles w={150} color={v.sparkC} style={{ right: -30, top: -110 }} />}
          <div style={{ ...serif, fontSize: v.serifT, lineHeight: 0.98, ...balance }}>{v.title}</div>
          {v.ul && <Underline width={v.ulW} color={v.ulC} mt={-24} align="center" sw={8} h={30} />}
          {v.hasSubtitle && <div style={{ fontSize: 40, lineHeight: 1.4, color: '#D2CFDA', maxWidth: 780 }}>{c.subtitle}</div>}
          {v.hasPrice && <div style={{ ...serif, fontSize: v.serifPr, lineHeight: 1, color: v.A, whiteSpace: 'nowrap' }}>{v.price}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
          {v.hasCta && <div style={{ height: 116, padding: '0 60px', border: `3px solid ${v.A}`, color: v.A, borderRadius: 999, fontSize: 38, fontWeight: 600, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{c.cta}</div>}
          {v.showLink && <div style={{ fontSize: 28, color: '#A9A6B4' }}>{v.linkShort}</div>}
        </div>
      </div>
    </div>
  );
}

const STYLE_COMPONENTS = { soft: Soft, editorial: Editorial, promo: Promo, minimal: Minimal, card: Card, luxe: Luxe };

const hatch = 'repeating-linear-gradient(135deg, rgba(208,0,168,0.22) 0 18px, rgba(208,0,168,0.08) 18px 36px)';
const safeLabel: React.CSSProperties = { fontSize: 30, fontWeight: 600, color: '#FFFFFF', background: '#D000A8', padding: '10px 26px', borderRadius: 999 };

export const CreativeCanvas = React.forwardRef<HTMLDivElement, { cfg: CreativeConfig; safe?: boolean }>(function CreativeCanvas({ cfg, safe }, ref) {
  const v = computeLayout(cfg);
  const S = STYLE_COMPONENTS[cfg.style];
  return (
    <div ref={ref} style={{ position: 'relative', width: 1080, height: v.H, overflow: 'hidden', fontFamily: SANS, color: INK, background: '#FFFFFF' }}>
      <S c={cfg} v={v} />
      {v.frame && <div style={{ position: 'absolute', inset: v.frame[0], border: `${v.frame[1]}px solid ${v.frame[2]}`, borderRadius: v.frame[3], pointerEvents: 'none', zIndex: 6 }} />}
      {safe && cfg.format === 'story' && (
        <>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 250, zIndex: 8, background: hatch, borderBottom: '4px dashed #D000A8', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 28 }}><span style={safeLabel}>Zona tapada por la app</span></div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 340, zIndex: 8, background: hatch, borderTop: '4px dashed #D000A8', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 28 }}><span style={safeLabel}>Zona tapada por la app</span></div>
        </>
      )}
    </div>
  );
});

export default function Creative({ cfg, width, radius = 0, shadow = false, safe = false }: { cfg: CreativeConfig; width: number; radius?: number; shadow?: boolean; safe?: boolean }) {
  const H = FORMAT_H[cfg.format];
  const s = width / 1080;
  return (
    <div style={{ width, height: Math.round(H * s), position: 'relative', overflow: 'hidden', flexShrink: 0, borderRadius: radius, background: '#FFFFFF', boxShadow: shadow ? '0 24px 60px rgba(15,14,26,0.16), 0 2px 8px rgba(15,14,26,0.08)' : 'none' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `scale(${s})`, transformOrigin: '0 0' }}>
        <CreativeCanvas cfg={cfg} safe={safe} />
      </div>
    </div>
  );
}
