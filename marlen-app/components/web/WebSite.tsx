'use client';

import React, { useEffect, useState } from 'react';
import BookingCalendarModal from '@/components/web/BookingCalendarModal';
import GiftCardBuy from '@/components/web/GiftCardBuy';
import { hex, luminance, mix } from '@/lib/marketing/color';
import { bookingPageToEmbedUrl, isBookingPageUrl } from '@/lib/web/booking-urls';
import { googleMapsEmbedUrl, instagramProfileUrl, parseInstagramUser } from '@/lib/web/extras';
import type { SiteProps, SiteService } from '@/lib/web/types';

/**
 * Web pública del centro. Mismo componente para la vista previa del editor y para la web publicada.
 * `narrow` = versión móvil (en producción, sustituir por media queries o pasar `narrow` según el viewport).
 */
const rgba = (h: string, a: number) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };
const DEFAULT_ICON = 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z';
const SV: [string, string, string][] = [['Limpieza facial profunda', '60 min · Extracción, peeling y mascarilla', '55 €'], ['Lifting de pestañas', '45 min · Tinte incluido', '45 €'], ['Manicura semipermanente', '40 min · Más de 80 colores', '25 €'], ['Masaje relajante', '50 min · Aceites templados', '48 €'], ['Láser diodo', 'Piernas completas · Por sesión', '59 €'], ['Presoterapia', '45 min · Piernas ligeras', '40 €']];
const balance = { textWrap: 'balance' } as React.CSSProperties;
const pretty = { textWrap: 'pretty' } as React.CSSProperties;

export default function WebSite(p: SiteProps) {
  const { look: L, pal: P, txt: t } = p;
  const fx = p.fx || {}, n = !!p.narrow, sec = p.sec || { servicios: true, nosotros: true, equipo: true, visitanos: true };
  const salon = p.salon || 'Arlett Beauty', logo = p.logo || '/marketing/arlett-logo.png';
  const bookHref = isBookingPageUrl(p.bookingUrl) ? (p.bookingUrl || '').trim() : undefined;
  const bookEmbed =
    (p.bookingEmbedUrl || '').trim() ||
    bookingPageToEmbedUrl(bookHref) ||
    undefined;
  const canBook = Boolean(bookEmbed || bookHref);
  const phoneLbl = (p.phone || '').trim() || null;
  const addressLbl = (p.address || '').trim() || null;
  const hoursLbl = (p.hours || '').trim() || null;
  const zoneLbl = (p.zone || '').trim() || null;
  const showFloat = p.showFloat !== false;
  const siteSlug = (p.siteSlug || '').trim() || null;
  const W = <T,>(a: T, b: T) => (n ? b : a), sf = L.serif, dark = luminance(P.bg) < 0.2;
  const px = W(72, 20), py = W(112, 60), r = n ? Math.min(L.radius, 18) : L.radius;
  const ang = [150, 205, 120, 175, 235, 95, 140, 190, 110, 165, 130, 215], pos = ['28% 30%', '72% 24%', '34% 72%', '76% 66%', '50% 42%', '22% 78%'];
  const ia = mix(P.accent, dark ? '#8A8090' : '#FFFFFF', 0.45), ib = mix(P.accent, '#1A1418', 0.6);
  const img = (i: number) => `radial-gradient(60% 55% at ${pos[i % 6]}, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0) 70%), linear-gradient(${ang[i % 12]}deg, ${i % 2 ? ib : ia} 0%, ${i % 2 ? ia : ib} 100%)`;
  const head = sf ? "var(--font-serif), 'Instrument Serif', Georgia, serif" : "var(--font-sora), 'Sora', system-ui, sans-serif";
  const headW = sf ? 400 : L.id === 'estudio' ? 700 : 600, headTrack = sf ? '-0.005em' : L.id === 'estudio' ? '-0.045em' : '-0.03em';
  const accentText = dark ? P.accent : mix(P.accent, P.ink, 0.62), menuLook = L.svc === 'menu';
  const h1 = { split: W(92, 46), full: W(104, 50), card: W(72, 36), stack: W(124, 48) }[L.hero];
  const h2 = sf ? W(64, 38) : W(48, 30), lead = W(19, 16), lbl = W(13, 11), lblTrack = sf ? '0.2em' : '0.12em', meta = W(15, 13);
  const btnH = W(56, 48), btnPx = W(30, 22), btnFs = W(16, 15), heroGap = W(26, 18), secPad = `${py}px ${px}px`, secGap = W(48, 28);
  const media = p.svcMedia || (L.svc === 'cards' ? 'photo' : 'none'), iconStyle = p.iconStyle || 'line';
  const PH = p.photos || { hero: null, about: null, team: [] };
  const cap = (ph: typeof PH.hero, def: string) => (ph ? (ph.label ? 'Foto · ' + ph.label : '') : 'Foto · ' + def);
  const capHero = cap(PH.hero, 'Cabina'), capAbout = cap(PH.about, 'El centro');
  const LIST: SiteService[] = (p.svcs || SV.map(([name, m, price], i) => ({ id: String(i), name, meta: m, price, pub: true, nov: false, book: true }))).filter((x) => x.pub !== false);
  const svcs = LIST.map((x, i) => ({ ...x, metaFull: x.meta + (x.book === false ? ' · Reserva por teléfono' : ''), num: (i < 9 ? '0' : '') + (i + 1), img: x.img || img(i + 4), icon: x.icon || DEFAULT_ICON }));
  const novs = LIST.filter((x) => x.nov).map((x, i) => ({
    ...x,
    img: x.img || img(i + 9),
    cta: x.book === false ? 'Pide información' : t.cta,
  }));
  const igUser = parseInstagramUser(fx.igUser);
  const igHref = instagramProfileUrl(fx.igUser);
  const igLabel = igUser ? `@${igUser}` : null;
  const igShowLink = Boolean(fx.igLink && igHref);
  const mapsEmbed = googleMapsEmbedUrl(fx.gUrl, addressLbl);
  const waDigits = String(fx.waNum || '').replace(/\D/g, '');
  const waHref = fx.wa && waDigits.length >= 9
    ? `https://wa.me/${waDigits.startsWith('34') ? waDigits : `34${waDigits}`}${fx.waMsg ? `?text=${encodeURIComponent(fx.waMsg)}` : ''}`
    : null;
  const floatBook = showFloat && canBook && (fx.book === 'float' || fx.book === 'both');
  const heroBg = PH.hero ? PH.hero.bg : img(0), aboutBg = PH.about ? PH.about.bg : img(3);
  const [bookOpen, setBookOpen] = useState(false);
  const openBook = () => { if (canBook) setBookOpen(true); };
  const igMedia = p.igMedia || [];
  const place = p.place || null;
  const giftAmounts = p.giftAmounts?.length ? p.giftAmounts : [30, 50, 100];
  const giftPreview = giftAmounts.includes(50) ? 50 : giftAmounts[0] || 50;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BeautySalon',
    name: salon,
    ...(addressLbl ? { address: addressLbl } : {}),
    ...(phoneLbl ? { telephone: phoneLbl } : {}),
    ...(bookHref ? { url: bookHref } : {}),
    ...(zoneLbl ? { areaServed: zoneLbl } : {}),
  };

  const Label = ({ children }: { children: React.ReactNode }) => <span style={{ fontSize: lbl, letterSpacing: lblTrack, textTransform: 'uppercase', color: accentText, fontWeight: 600 }}>{children}</span>;
  const H2 = ({ children }: { children: React.ReactNode }) => <h2 style={{ margin: 0, fontFamily: head, fontWeight: headW, fontSize: h2, lineHeight: 1.05, letterSpacing: headTrack, ...balance }}>{children}</h2>;
  const Btn = ({ children, style, href, onClick }: { children: React.ReactNode; style?: React.CSSProperties; href?: string; onClick?: () => void }) => {
    const css: React.CSSProperties = { height: btnH, padding: `0 ${btnPx}px`, borderRadius: L.br, background: P.accent, color: P.onAccent, fontSize: btnFs, fontWeight: 600, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', textDecoration: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', ...style };
    if (href) return <a href={href} target="_blank" rel="noopener noreferrer" style={css}>{children}</a>;
    if (onClick || canBook) {
      return <button type="button" onClick={onClick || openBook} style={css}>{children}</button>;
    }
    return <span style={css}>{children}</span>;
  };
  const Caption = ({ text, style }: { text: string; style: React.CSSProperties }) => (text ? <span style={{ position: 'absolute', fontSize: 12, fontWeight: 600, color: '#FFFFFF', background: 'rgba(15,14,26,0.35)', padding: '6px 12px', borderRadius: 999, ...style }}>{text}</span> : null);
  const New = () => <span style={{ height: 22, padding: '0 9px', borderRadius: 999, background: P.accent, color: P.onAccent, fontFamily: "var(--font-sora), 'Sora', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>NUEVO</span>;
  const mIcon = W(52, 42);
  const Icon = ({ d }: { d: string }) => (
    <div style={{ width: mIcon, height: mIcon, borderRadius: iconStyle === 'solid' || sf ? '50%' : Math.max(r, 10), background: iconStyle === 'solid' ? P.accent : iconStyle === 'plain' ? 'transparent' : mix(P.accent, P.bg, 0.16), color: iconStyle === 'solid' ? P.onAccent : accentText, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={iconStyle === 'plain' ? W(30, 26) : W(24, 20)} height={iconStyle === 'plain' ? W(30, 26) : W(24, 20)} viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d={d} /></svg>
    </div>
  );
  const chipR = Math.min(12, r + 8);
  const [menuOpen, setMenuOpen] = useState(false);

  const showReviews = Boolean(fx.reviews && ((place?.reviews?.length || 0) > 0 || (fx.gUrl || '').trim()));
  const showInsta = Boolean(fx.insta && (igMedia.length > 0 || igUser || igShowLink));

  const navLinks: { id: string; label: string }[] = [];
  if (sec.servicios) navLinks.push({ id: 'servicios', label: 'Servicios' });
  if (sec.nosotros) navLinks.push({ id: 'nosotros', label: 'Nosotros' });
  if (sec.equipo) navLinks.push({ id: 'equipo', label: 'Equipo' });
  if (showReviews) navLinks.push({ id: 'reseñas', label: 'Reseñas' });
  if (fx.gift) navLinks.push({ id: 'regalo', label: 'Tarjeta regalo' });
  if (showInsta) navLinks.push({ id: 'instagram', label: 'Instagram' });
  if (sec.visitanos) navLinks.push({ id: 'visitanos', label: 'Visítanos' });

  const goTo = (id: string) => {
    setMenuOpen(false);
    // rAF: el menú móvil se cierra antes de medir; necesario con zoom del preview
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (!el) return;
      const scroller = el.closest('[data-site-scroll]') as HTMLElement | null;
      if (scroller) {
        const delta = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
        scroller.scrollBy({ top: delta - 16, behavior: 'smooth' });
        return;
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const navLinkCss: React.CSSProperties = {
    color: P.muted,
    textDecoration: 'none',
    background: 'none',
    border: 'none',
    padding: 0,
    font: 'inherit',
    fontSize: 14,
    cursor: 'pointer',
  };

  return (
    <div style={{ position: 'relative', width: '100%', background: P.bg, color: P.ink, fontFamily: "var(--font-sora), 'Sora', system-ui, sans-serif", WebkitFontSmoothing: 'antialiased' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <div style={{ position: 'sticky', top: 0, zIndex: 30 }}>
        {fx.bar && (fx.barText || '').trim() && <div style={{ background: P.accent, color: P.onAccent, textAlign: 'center', fontSize: W(14, 12), fontWeight: 600, padding: W('11px 24px', '9px 16px') }}>{fx.barText}</div>}
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: W(`20px ${px}px`, '14px 20px'), background: P.bg, borderBottom: `1px solid ${P.line}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="" style={{ width: W(44, 34), height: W(44, 34), borderRadius: sf ? '50%' : Math.min(12, r + 6), objectFit: 'cover', flexShrink: 0 }} />
            <span style={{ fontFamily: head, fontWeight: headW, fontSize: sf ? W(28, 22) : W(19, 16), letterSpacing: headTrack, whiteSpace: 'nowrap' }}>{salon}</span>
          </div>
          {!n && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap', justifyContent: 'center', flex: 1, minWidth: 0 }}>
              {navLinks.map(l => (
                <a
                  key={l.id}
                  href={`#${l.id}`}
                  onClick={e => { e.preventDefault(); goTo(l.id); }}
                  style={{ ...navLinkCss, display: 'inline-flex' }}
                >
                  {l.label}
                </a>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {canBook ? (
              <button type="button" onClick={openBook} style={{ height: W(44, 36), padding: `0 ${W(20, 14)}px`, borderRadius: L.br, background: P.accent, color: P.onAccent, fontSize: W(14, 13), fontWeight: 600, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{t.cta}</button>
            ) : (
              <span style={{ height: W(44, 36), padding: `0 ${W(20, 14)}px`, borderRadius: L.br, background: P.accent, color: P.onAccent, fontSize: W(14, 13), fontWeight: 600, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{t.cta}</span>
            )}
            {n && (
              <button
                type="button"
                aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(o => !o)}
                style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', color: P.ink, cursor: 'pointer', padding: 0, flexShrink: 0 }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ strokeWidth: 1.8, strokeLinecap: 'round' }}>
                  {menuOpen
                    ? <path d="M6 6l12 12M18 6L6 18" />
                    : <path d="M4 7h16M4 12h16M4 17h16" />}
                </svg>
              </button>
            )}
          </div>
        </nav>

        {n && menuOpen && (
          <div
            role="dialog"
            aria-label="Menú"
            style={{
              background: P.bg,
              borderBottom: `1px solid ${P.line}`,
              boxShadow: '0 16px 40px rgba(15,14,26,0.12)',
              padding: '8px 20px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {navLinks.map(l => (
              <button
                key={l.id}
                type="button"
                onClick={() => goTo(l.id)}
                style={{
                  height: 48,
                  padding: '0 4px',
                  border: 'none',
                  background: 'none',
                  color: P.ink,
                  fontSize: 17,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderBottom: `1px solid ${P.line}`,
                }}
              >
                {l.label}
              </button>
            ))}
            {canBook && (
              <button
                type="button"
                onClick={() => { setMenuOpen(false); openBook(); }}
                style={{
                  marginTop: 12,
                  height: btnH,
                  borderRadius: L.br,
                  background: P.accent,
                  color: P.onAccent,
                  fontSize: btnFs,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {t.cta}
              </button>
            )}
          </div>
        )}
      </div>

      {n && menuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 20, border: 'none', background: 'rgba(15,14,26,0.28)', cursor: 'pointer' }}
        />
      )}

      {L.hero === 'split' && (
        <section style={{ display: 'grid', gridTemplateColumns: W('1.05fr 0.95fr', '1fr'), gap: W(72, 32), alignItems: 'center', padding: W(`72px ${px}px 104px`, '32px 20px 52px') }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: heroGap }}>
            <span style={{ fontSize: lbl, letterSpacing: '0.2em', textTransform: 'uppercase', color: accentText, fontWeight: 600 }}>Centro de estética · Madrid</span>
            <h1 style={{ margin: 0, fontFamily: head, fontWeight: headW, fontSize: h1, lineHeight: 1, letterSpacing: headTrack, ...balance }}>{t.heroTitle}</h1>
            <p style={{ margin: 0, fontSize: lead, lineHeight: 1.55, color: P.muted, maxWidth: 480, ...pretty }}>{t.heroSub}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <Btn>{t.cta}</Btn>
              <button type="button" onClick={() => goTo('servicios')} style={{ fontSize: btnFs, fontWeight: 600, whiteSpace: 'nowrap', background: 'none', border: 'none', borderBottom: '1.5px solid currentColor', color: 'inherit', cursor: 'pointer', fontFamily: 'inherit', padding: '0 0 2px' }}>Ver servicios</button>
            </div>
          </div>
          <div style={{ position: 'relative', height: W(640, 400), borderRadius: W('320px 320px 0 0', '170px 170px 0 0'), overflow: 'hidden', background: heroBg }}><Caption text={capHero} style={{ left: 16, bottom: 16 }} /></div>
        </section>
      )}
      {L.hero === 'full' && (
        <section style={{ position: 'relative', height: W(780, 620), display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', overflow: 'hidden', background: heroBg }}>
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${rgba(P.bg, 0.55)} 0%, ${rgba(P.bg, 0.86)} 100%)` }} />
          <div style={{ position: 'absolute', inset: W(28, 12), border: `1px solid ${rgba(P.accent, 0.45)}` }} />
          <Caption text={capHero} style={{ left: W(48, 24), top: W(48, 24), background: 'rgba(0,0,0,0.35)' }} />
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: heroGap, padding: `0 ${px}px`, maxWidth: 1000 }}>
            <span style={{ fontSize: lbl, letterSpacing: '0.32em', textTransform: 'uppercase', color: P.accent, fontWeight: 500 }}>{salon} · Madrid</span>
            <h1 style={{ margin: 0, fontFamily: head, fontWeight: headW, fontSize: h1, lineHeight: 1, letterSpacing: headTrack, ...balance }}>{t.heroTitle}</h1>
            <p style={{ margin: 0, fontSize: lead, lineHeight: 1.55, color: P.muted, maxWidth: 560, ...pretty }}>{t.heroSub}</p>
            <span style={{ height: btnH, padding: `0 ${btnPx}px`, borderRadius: L.br, border: `1.5px solid ${P.accent}`, color: P.accent, fontSize: btnFs, fontWeight: 600, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', marginTop: 8, whiteSpace: 'nowrap' }}>{t.cta}</span>
          </div>
        </section>
      )}
      {L.hero === 'card' && (
        <section style={{ padding: W(`16px ${px}px 0`, '8px 12px 0') }}>
          <div style={{ position: 'relative', height: W(680, 560), borderRadius: W(32, 22), overflow: 'hidden', background: heroBg, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: W(48, 22) }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(10,12,10,0.62) 100%)' }} />
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ height: 34, padding: '0 14px', borderRadius: 999, background: 'rgba(255,255,255,0.85)', color: '#1E1E1E', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>Reserva online 24 h</span>
              {capHero && <span style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: 999, alignSelf: 'flex-start' }}>{capHero}</span>}
            </div>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: heroGap, color: '#FFFFFF', maxWidth: 760 }}>
              <h1 style={{ margin: 0, fontFamily: head, fontWeight: headW, fontSize: h1, lineHeight: 1.02, letterSpacing: headTrack, ...balance }}>{t.heroTitle}</h1>
              <p style={{ margin: 0, fontSize: lead, lineHeight: 1.5, color: 'rgba(255,255,255,0.92)', maxWidth: 520, ...pretty }}>{t.heroSub}</p>
              <Btn style={{ alignSelf: 'flex-start', background: '#FFFFFF', color: P.ink }}>{t.cta}</Btn>
            </div>
          </div>
        </section>
      )}
      {L.hero === 'stack' && (
        <section style={{ padding: W(`64px ${px}px 0`, '28px 20px 0'), display: 'flex', flexDirection: 'column', gap: W(32, 20) }}>
          <span style={{ fontSize: lbl, fontWeight: 600, color: P.muted }}>{salon} — Centro de estética en Madrid</span>
          <h1 style={{ margin: 0, fontFamily: head, fontWeight: headW, fontSize: h1, lineHeight: 0.98, letterSpacing: headTrack, maxWidth: 1080, ...balance }}>{t.heroTitle}</h1>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: lead, lineHeight: 1.55, color: P.muted, maxWidth: 520, ...pretty }}>{t.heroSub}</p>
            <Btn style={{ gap: 10 }}>{t.cta}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M5 12h14M13 6l6 6-6 6" /></svg></Btn>
          </div>
          <div style={{ position: 'relative', height: W(560, 300), borderRadius: r, overflow: 'hidden', background: heroBg }}><Caption text={capHero} style={{ left: 16, bottom: 16 }} /></div>
        </section>
      )}

      {novs.length > 0 && (
        <section style={{ padding: secPad, display: 'flex', flexDirection: 'column', gap: secGap }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><Label>Novedades</Label><H2>Recién llegados al centro</H2></div>
          <div style={{ display: 'grid', gridTemplateColumns: W('repeat(2, minmax(0, 1fr))', '1fr'), gap: W(20, 10) }}>
            {novs.map((nv) => (
              <div key={nv.id} style={{ display: 'grid', gridTemplateColumns: W('0.9fr 1fr', '1fr'), borderRadius: r, background: P.surface, overflow: 'hidden' }}>
                <div style={{ position: 'relative', minHeight: W(280, 170), background: nv.img }}><span style={{ position: 'absolute', top: 14, left: 14 }}><New /></span></div>
                <div style={{ padding: W('28px 28px 28px 8px', '16px 18px 20px'), display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                  <span style={{ fontFamily: head, fontWeight: headW, fontSize: sf ? W(30, 22) : W(21, 17), lineHeight: 1.1, letterSpacing: headTrack }}>{nv.name}</span>
                  <span style={{ fontSize: meta, color: P.muted, lineHeight: 1.45 }}>{nv.meta}</span>
                  <span style={{ fontSize: sf ? W(30, 22) : W(21, 17), fontWeight: 700, marginTop: 4 }}>{nv.price}</span>
                  <span style={{ alignSelf: 'flex-start', marginTop: 8, height: 44, padding: '0 20px', borderRadius: L.br, border: `1.5px solid ${P.ink}`, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{nv.cta}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {sec.servicios && (
        <section id="servicios" style={{ padding: secPad, background: menuLook ? P.surface : P.bg, display: 'flex', flexDirection: 'column', gap: secGap }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><Label>Servicios</Label><H2>Nuestros tratamientos</H2></div>
            {canBook ? (
              <button type="button" onClick={openBook} style={{ fontSize: 15, fontWeight: 600, color: accentText, textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>Reservar online →</button>
            ) : (
              <span style={{ fontSize: 15, fontWeight: 600, color: accentText }}>Reservar online →</span>
            )}
          </div>
          {L.svc === 'menu' && (
            <div style={{ display: 'grid', gridTemplateColumns: W('1fr 1fr', '1fr'), columnGap: 72 }}>
              {svcs.map((sv) => (
                <div key={sv.id} style={{ display: 'flex', alignItems: 'center', gap: W(20, 14), padding: W('24px 0', '16px 0'), borderTop: `1px solid ${P.line}` }}>
                  {media === 'photo' && <div style={{ width: W(72, 52), height: W(72, 52), borderRadius: sf ? '50%' : Math.max(r, 8), background: sv.img, flexShrink: 0 }} />}
                  {media === 'icon' && <Icon d={sv.icon} />}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flexWrap: 'wrap' }}><span style={{ fontFamily: head, fontWeight: headW, fontSize: sf ? W(28, 21) : W(20, 17) }}>{sv.name}</span>{sv.nov && <New />}</span>
                      <span style={{ fontFamily: head, fontWeight: headW, fontSize: sf ? W(28, 21) : W(20, 17), whiteSpace: 'nowrap', color: accentText }}>{sv.price}</span>
                    </div>
                    <span style={{ fontSize: meta, color: P.muted }}>{sv.metaFull}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {L.svc === 'cards' && (
            <div style={{ display: 'grid', gridTemplateColumns: W('repeat(3, minmax(0, 1fr))', '1fr 1fr'), gap: W(20, 10) }}>
              {svcs.map((sv) => (
                <div key={sv.id} style={{ borderRadius: r, background: P.surface, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {media === 'photo' && <div style={{ height: W(220, 110), background: sv.img }} />}
                  {media === 'icon' && <div style={{ padding: W('22px 22px 0', '12px 12px 0') }}><Icon d={sv.icon} /></div>}
                  <div style={{ padding: W('22px 22px 24px', '12px 12px 14px'), display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {sv.nov && <span style={{ display: 'flex' }}><New /></span>}
                    <span style={{ fontSize: W(19, 14), fontWeight: 600, letterSpacing: '-0.01em' }}>{sv.name}</span>
                    <span style={{ fontSize: meta, color: P.muted, lineHeight: 1.4 }}>{sv.metaFull}</span>
                    <span style={{ fontSize: W(19, 14), fontWeight: 700, marginTop: 6 }}>{sv.price}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {L.svc === 'grid' && (
            <div style={{ display: 'grid', gridTemplateColumns: W('repeat(3, minmax(0, 1fr))', '1fr'), borderTop: `1px solid ${P.line}`, borderLeft: `1px solid ${P.line}` }}>
              {svcs.map((sv) => (
                <div key={sv.id} style={{ padding: W('32px 28px', '20px 18px'), borderRight: `1px solid ${P.line}`, borderBottom: `1px solid ${P.line}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {media === 'photo' && <div style={{ height: W(170, 140), borderRadius: r, background: sv.img, marginBottom: 8 }} />}
                  {media === 'icon' && <div style={{ marginBottom: 6 }}><Icon d={sv.icon} /></div>}
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><span style={{ fontSize: 13, fontWeight: 600, color: accentText }}>{sv.num}</span>{sv.nov && <New />}</span>
                  <span style={{ fontSize: W(19, 14), fontWeight: 700, letterSpacing: '-0.02em' }}>{sv.name}</span>
                  <span style={{ fontSize: meta, color: P.muted }}>{sv.metaFull}</span>
                  <span style={{ fontSize: W(19, 14), fontWeight: 700, marginTop: 10 }}>{sv.price}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {(fx.book === 'embed' || fx.book === 'both') && (
        <section id="reservar" style={{ padding: secPad, display: 'flex', flexDirection: 'column', gap: secGap }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><Label>Reserva online</Label><H2>Elige día y hora</H2></div>
          {bookEmbed ? (
            <div style={{ borderRadius: r, overflow: 'hidden', border: `1px solid ${P.line}`, background: dark ? P.surface : '#FFFFFF', minHeight: W(720, 560) }}>
              <iframe title="Reservar cita" src={bookEmbed} style={{ width: '100%', height: W(720, 560), border: 'none', display: 'block' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: W(28, 20), borderRadius: r, border: `1px solid ${P.line}`, background: dark ? P.surface : '#FFFFFF' }}>
              <p style={{ margin: 0, fontSize: lead, color: P.muted, lineHeight: 1.5 }}>
                Configura el enlace público de reservas en Ajustes → Reservas para incrustar el calendario aquí.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {LIST.filter((x) => x.book !== false).slice(0, 4).map((x) => (
                  <span key={x.id} style={{ height: 40, padding: '0 14px', borderRadius: chipR, border: `1px solid ${P.line}`, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center' }}>{x.name}</span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {sec.nosotros && (
        <section id="nosotros" style={{ padding: secPad, display: 'grid', gridTemplateColumns: W('1fr 1fr', '1fr'), gap: W(80, 28), alignItems: 'center' }}>
          <div style={{ position: 'relative', height: W(580, 320), borderRadius: r, overflow: 'hidden', background: aboutBg }}><Caption text={capAbout} style={{ left: 16, bottom: 16 }} /></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Label>Sobre nosotros</Label><H2>{t.aboutTitle}</H2>
            <p style={{ margin: 0, fontSize: lead, lineHeight: 1.65, color: P.muted, maxWidth: 520, ...pretty }}>{t.aboutText}</p>
          </div>
        </section>
      )}

      {showReviews && (
        <section id="reseñas" style={{ padding: secPad, background: P.surface, display: 'flex', flexDirection: 'column', gap: secGap }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><Label>Reseñas</Label><H2>Lo que dicen en Google</H2></div>
          {place?.reviews?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: W(28, 18) }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: head, fontWeight: headW, fontSize: W(48, 36), lineHeight: 1 }}>
                  {place.rating?.toFixed(1) ?? '—'}
                </span>
                <span style={{ color: dark ? P.accent : mix(P.accent, P.ink, 0.75), fontSize: W(22, 18), letterSpacing: 2 }}>
                  {'★'.repeat(Math.round(place.rating || 5))}
                </span>
                {place.userRatingCount != null && (
                  <span style={{ fontSize: meta, color: P.muted }}>
                    {place.userRatingCount} reseñas en Google
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: W('repeat(3, minmax(0, 1fr))', '1fr'), gap: W(16, 12) }}>
                {place.reviews.slice(0, 3).map((rev, i) => (
                  <blockquote
                    key={`${rev.author}-${i}`}
                    style={{ margin: 0, padding: W(24, 18), borderRadius: r, background: P.bg, display: 'flex', flexDirection: 'column', gap: 12 }}
                  >
                    <span style={{ color: dark ? P.accent : mix(P.accent, P.ink, 0.75), letterSpacing: 2, fontSize: 14 }}>
                      {'★'.repeat(Math.min(5, Math.max(1, Math.round(rev.rating))))}
                    </span>
                    <p style={{ margin: 0, fontSize: meta, lineHeight: 1.55, color: P.muted, ...pretty }}>
                      {rev.text.length > 220 ? `${rev.text.slice(0, 217)}…` : rev.text}
                    </p>
                    <footer style={{ fontSize: 13, fontWeight: 600 }}>
                      {rev.author}
                      {rev.relativeTime ? <span style={{ fontWeight: 500, color: P.muted }}> · {rev.relativeTime}</span> : null}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: meta, color: P.muted, lineHeight: 1.5, maxWidth: 520 }}>
              {showFloat
                ? 'Las reseñas se cargan al publicar (hace falta GOOGLE_PLACES_API_KEY en el servidor).'
                : 'Vista previa: al publicar con GOOGLE_PLACES_API_KEY saldrán aquí las reseñas reales de tu ficha.'}
            </p>
          )}
        </section>
      )}

      {sec.equipo && (
        <section id="equipo" style={{ padding: secPad, background: menuLook ? P.bg : P.surface, display: 'flex', flexDirection: 'column', gap: secGap }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><Label>Equipo</Label><H2>Quién te atiende</H2></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: W(24, 10) }}>
            {(p.team?.length ? p.team : [['Equipo', 'Profesionales']] as [string, string][]).slice(0, 6).map(([name, role], i) => (
              <div key={name + i} style={{ display: 'flex', flexDirection: 'column', gap: W(16, 8) }}>
                <div style={{ aspectRatio: '4 / 5', borderRadius: r, background: PH.team[i] || img(i + 7) }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span style={{ fontFamily: head, fontWeight: headW, fontSize: sf ? W(28, 17) : W(19, 13) }}>{name}</span><span style={{ fontSize: W(15, 11), color: P.muted }}>{role}</span></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {fx.gift && (
        <section id="regalo" style={{ padding: secPad, display: 'grid', gridTemplateColumns: W('1fr 1fr', '1fr'), gap: W(80, 28), alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Label>Tarjeta regalo</Label><H2>Regala un rato para ti, o para quien tú quieras</H2>
            <p style={{ margin: 0, fontSize: lead, lineHeight: 1.6, color: P.muted, maxWidth: 480 }}>
              Elige importe ({giftAmounts.map(a => `${a} €`).join(', ')}). Pago seguro y canje en el centro.
            </p>
            {siteSlug ? (
              <GiftCardBuy
                slug={siteSlug}
                amountsEur={giftAmounts}
                accent={P.accent}
                onAccent={P.onAccent}
                ink={P.ink}
                muted={P.muted}
                line={P.line}
                bg={P.bg}
                radius={L.br}
                btnHeight={btnH}
                btnPx={btnPx}
                btnFs={btnFs}
              />
            ) : (
              <Btn style={{ alignSelf: 'flex-start' }}>Comprar tarjeta regalo</Btn>
            )}
          </div>
          <div style={{ aspectRatio: '1.6', maxWidth: 520, width: '100%', justifySelf: 'center', borderRadius: Math.max(16, r), background: `linear-gradient(135deg, ${P.accent} 0%, ${mix(P.accent, '#1A1418', 0.7)} 100%)`, color: P.onAccent, padding: W(36, 22), display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><span style={{ fontFamily: head, fontWeight: headW, fontSize: sf ? W(30, 22) : W(20, 16) }}>{salon}</span><span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Tarjeta regalo</span></div>
            <span style={{ fontFamily: head, fontWeight: headW, fontSize: sf ? W(96, 60) : W(72, 48), lineHeight: 1 }}>{giftPreview} €</span>
          </div>
        </section>
      )}

      {showInsta && (
        <section id="instagram" style={{ padding: secPad, background: menuLook ? P.bg : P.surface, display: 'flex', flexDirection: 'column', gap: secGap }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Label>Instagram</Label>
              <H2>{igLabel ? `En ${igLabel}` : 'Nuestro Instagram'}</H2>
            </div>
            {igShowLink && igHref && (
              <a href={igHref} target="_blank" rel="noopener noreferrer" style={{ fontSize: 15, fontWeight: 600, color: accentText, textDecoration: 'none' }}>
                Ver perfil →
              </a>
            )}
          </div>
          {igMedia.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: W('repeat(6, minmax(0, 1fr))', 'repeat(3, minmax(0, 1fr))'), gap: W(12, 6) }}>
              {igMedia.slice(0, 6).map((m) => {
                const tileStyle: React.CSSProperties = {
                  aspectRatio: '1',
                  borderRadius: Math.min(r, 12),
                  background: `url("${m.mediaUrl}") center / cover no-repeat`,
                  display: 'block',
                  overflow: 'hidden',
                  textDecoration: 'none',
                };
                const label = m.caption ? m.caption.slice(0, 80) : `Foto de Instagram${igLabel ? ` · ${igLabel}` : ''}`;
                if (igShowLink && igHref) {
                  return (
                    <a
                      key={m.id}
                      href={m.permalink || igHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      style={tileStyle}
                    />
                  );
                }
                return <div key={m.id} role="img" aria-label={label} style={tileStyle} />;
              })}
            </div>
          ) : igUser ? (
            <div style={{ borderRadius: Math.max(12, r), overflow: 'hidden', border: `1px solid ${P.line}`, background: P.bg, minHeight: W(540, 420) }}>
              <iframe
                title={`Instagram ${igLabel || ''}`}
                src={`https://www.instagram.com/${encodeURIComponent(igUser)}/embed`}
                style={{ width: '100%', height: W(540, 420), border: 'none', display: 'block' }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: meta, color: P.muted, lineHeight: 1.5 }}>
              Escribe tu usuario de Instagram en Extras (ej. @tucentro).
            </p>
          )}
          {igShowLink && igHref && (
            <Btn href={igHref} style={{ alignSelf: 'flex-start' }}>
              Abrir {igLabel || 'Instagram'}
            </Btn>
          )}
        </section>
      )}

      {sec.visitanos && (
        <section id="visitanos" style={{ padding: secPad, display: 'grid', gridTemplateColumns: W('1fr 1fr', '1fr'), gap: W(80, 28), alignItems: 'stretch' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><Label>Visítanos</Label><H2>Te esperamos</H2></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontSize: lead, lineHeight: 1.5 }}>
              {addressLbl && <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 13, color: P.muted }}>Dirección</span><span>{addressLbl}</span></div>}
              {hoursLbl && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, color: P.muted }}>Horario</span>
                  {hoursLbl.split('\n').map((line, i) => <span key={i}>{line}</span>)}
                </div>
              )}
              {phoneLbl && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, color: P.muted }}>Teléfono</span>
                  <a href={`tel:${phoneLbl.replace(/\s/g, '')}`} style={{ color: 'inherit', textDecoration: 'none' }}>{phoneLbl}</a>
                </div>
              )}
              {!addressLbl && !phoneLbl && !hoursLbl && (
                <p style={{ margin: 0, fontSize: meta, color: P.muted, lineHeight: 1.5 }}>Añade dirección y teléfono en Ajustes → Centro para mostrarlos aquí.</p>
              )}
            </div>
            <Btn style={{ alignSelf: 'flex-start' }}>{t.cta}</Btn>
          </div>
          <div style={{ position: 'relative', minHeight: W(460, 260), borderRadius: r, overflow: 'hidden', background: P.surface, backgroundImage: `repeating-linear-gradient(0deg, ${rgba(P.ink, 0.06)} 0 1px, transparent 1px 48px), repeating-linear-gradient(90deg, ${rgba(P.ink, 0.06)} 0 1px, transparent 1px 48px)` }}>
            {mapsEmbed ? (
              <iframe title="Mapa" src={mapsEmbed} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} loading="lazy" />
            ) : (
              <>
                <div style={{ position: 'absolute', left: '50%', top: '46%', width: 44, height: 44, margin: '-22px 0 0 -22px', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: P.accent, boxShadow: '0 8px 20px rgba(0,0,0,0.2)' }} />
                <span style={{ position: 'absolute', left: 16, bottom: 16, fontSize: 12, fontWeight: 600, color: P.ink, background: P.bg, padding: '6px 12px', borderRadius: 999 }}>{addressLbl ? `Mapa · ${addressLbl}` : salon}</span>
              </>
            )}
          </div>
        </section>
      )}

      <section style={{ padding: W(`80px ${px}px`, '48px 20px'), background: P.accent, color: P.onAccent, display: 'flex', flexDirection: W('row', 'column'), alignItems: W('center', 'flex-start'), justifyContent: 'space-between', gap: 24 }}>
        <h2 style={{ margin: 0, fontFamily: head, fontWeight: headW, fontSize: sf ? W(60, 36) : W(44, 28), lineHeight: 1.05, letterSpacing: headTrack, ...balance }}>Reserva online en dos minutos</h2>
        <Btn style={{ background: P.onAccent, color: P.accent, flexShrink: 0 }}>{t.cta}</Btn>
      </section>
      <footer style={{ padding: W(`28px ${px}px`, '20px 20px 28px'), display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 13, color: P.muted, borderTop: `1px solid ${P.line}` }}>
        <span>© {new Date().getFullYear()} {salon}{addressLbl ? ` · ${addressLbl}` : ''}</span>
        <span style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {siteSlug && (
            <>
              <a href={`/s/${siteSlug}/aviso-legal`} style={{ color: 'inherit' }}>Aviso legal</a>
              <a href={`/s/${siteSlug}/privacidad`} style={{ color: 'inherit' }}>Privacidad</a>
              <a href={`/s/${siteSlug}/cookies`} style={{ color: 'inherit' }}>Cookies</a>
            </>
          )}
          <span>Web creada con Marlenapp</span>
        </span>
      </footer>

      {(floatBook || waHref) && (
        <div style={{ position: 'fixed', right: W(28, 16), bottom: W(28, 16), zIndex: 50, display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'auto' }}>
          {floatBook && (
            <button
              type="button"
              onClick={openBook}
              style={{ height: 48, padding: '0 18px', borderRadius: L.br === '0px' ? 0 : L.br === '4px' ? 6 : 999, background: P.accent, color: P.onAccent, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 24px rgba(0,0,0,.22)' }}
            >
              {t.cta}
            </button>
          )}
          {waHref && (
            <a href={waHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" style={{ width: 48, height: 48, borderRadius: '50%', background: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', boxShadow: '0 10px 24px rgba(0,0,0,.22)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M4 20l1.4-4.2A8 8 0 1 1 8.4 19zM9.5 9.5c.3 1.8 1.7 3.4 3.5 4l1-1 1.5.8" /></svg>
            </a>
          )}
        </div>
      )}

      {bookEmbed && (
        <BookingCalendarModal
          open={bookOpen}
          onClose={() => setBookOpen(false)}
          embedUrl={bookEmbed}
          title={t.cta || 'Reservar cita'}
          accent={P.accent}
          onAccent={P.onAccent}
          ink={P.ink}
          bg={P.bg}
        />
      )}
    </div>
  );
}
