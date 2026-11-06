'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { IgMedia } from '@/lib/web/instagram';
import type { IgLayout } from '@/lib/web/types';

type Props = {
  media: IgMedia[];
  layout: IgLayout;
  narrow: boolean;
  radius: number;
  line: string;
  muted: string;
  ink: string;
  accent: string;
  surface: string;
  bg: string;
  /** Si hay enlace al perfil, las fotos abren el permalink. */
  linkPosts: boolean;
  profileHref: string | null;
  profileLabel: string | null;
};

function Tile({
  m,
  linkPosts,
  profileHref,
  profileLabel,
  style,
  caption,
}: {
  m: IgMedia;
  linkPosts: boolean;
  profileHref: string | null;
  profileLabel: string | null;
  style: React.CSSProperties;
  caption?: boolean;
}) {
  const label = m.caption
    ? m.caption.slice(0, 100)
    : `Foto de Instagram${profileLabel ? ` · ${profileLabel}` : ''}`;
  const body = (
    <>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `url("${m.mediaUrl}") center / cover no-repeat`,
          transition: 'transform .55s cubic-bezier(.22,1,.36,1)',
        }}
        className="ig-tile-img"
      />
      {caption && m.caption ? (
        <span
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '28px 16px 14px',
            background: 'linear-gradient(180deg, transparent 0%, rgba(12,10,16,0.72) 100%)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {m.caption}
        </span>
      ) : null}
    </>
  );

  const base: React.CSSProperties = {
    position: 'relative',
    display: 'block',
    overflow: 'hidden',
    textDecoration: 'none',
    color: 'inherit',
    ...style,
  };

  if (linkPosts && (m.permalink || profileHref)) {
    return (
      <a
        href={m.permalink || profileHref!}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        style={base}
        onMouseEnter={e => {
          const img = e.currentTarget.querySelector('.ig-tile-img') as HTMLElement | null;
          if (img) img.style.transform = 'scale(1.04)';
        }}
        onMouseLeave={e => {
          const img = e.currentTarget.querySelector('.ig-tile-img') as HTMLElement | null;
          if (img) img.style.transform = 'scale(1)';
        }}
      >
        {body}
      </a>
    );
  }
  return (
    <div role="img" aria-label={label} style={base}>
      {body}
    </div>
  );
}

export default function IgFeed({
  media,
  layout,
  narrow,
  radius,
  line,
  muted,
  ink,
  accent,
  surface,
  bg,
  linkPosts,
  profileHref,
  profileLabel,
}: Props) {
  const items = media.slice(0, layout === 'grid' ? 9 : 12);
  const r = Math.min(radius, narrow ? 16 : 20);
  const trackRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const scrollTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const child = el.children[i] as HTMLElement | undefined;
    if (!child) return;
    el.scrollTo({ left: child.offsetLeft - (narrow ? 0 : 8), behavior: 'smooth' });
    setIdx(i);
  };

  useEffect(() => {
    if (layout !== 'carousel' || items.length < 2 || paused) return;
    const t = window.setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      setIdx(prev => {
        const next = (prev + 1) % items.length;
        const child = el.children[next] as HTMLElement | undefined;
        if (child) {
          el.scrollTo({ left: Math.max(0, child.offsetLeft - (narrow ? 0 : 8)), behavior: 'smooth' });
        }
        return next;
      });
    }, 4200);
    return () => window.clearInterval(t);
  }, [layout, items.length, paused, narrow]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || layout !== 'carousel') return;
    const onScroll = () => {
      const kids = Array.from(el.children) as HTMLElement[];
      let best = 0;
      let bestDist = Infinity;
      const mid = el.scrollLeft + el.clientWidth / 2;
      kids.forEach((c, i) => {
        const cMid = c.offsetLeft + c.clientWidth / 2;
        const d = Math.abs(cMid - mid);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      setIdx(best);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [layout, items.length]);

  if (!items.length) return null;

  if (layout === 'spotlight') {
    const [hero, ...rest] = items;
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: narrow ? '1fr' : '1.35fr 1fr',
          gap: narrow ? 10 : 14,
          alignItems: 'stretch',
        }}
      >
        <Tile
          m={hero!}
          linkPosts={linkPosts}
          profileHref={profileHref}
          profileLabel={profileLabel}
          caption
          style={{
            aspectRatio: narrow ? '4 / 5' : '1 / 1',
            borderRadius: r,
            minHeight: narrow ? 280 : 420,
          }}
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: narrow ? 8 : 12,
          }}
        >
          {rest.slice(0, 4).map(m => (
            <Tile
              key={m.id}
              m={m}
              linkPosts={linkPosts}
              profileHref={profileHref}
              profileLabel={profileLabel}
              style={{ aspectRatio: '1', borderRadius: Math.min(r, 14) }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (layout === 'grid') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: narrow ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))',
          gap: narrow ? 8 : 14,
        }}
      >
        {items.map((m, i) => (
          <Tile
            key={m.id}
            m={m}
            linkPosts={linkPosts}
            profileHref={profileHref}
            profileLabel={profileLabel}
            caption={!narrow && i === 0}
            style={{
              aspectRatio: !narrow && i === 0 ? '1' : '1',
              borderRadius: Math.min(r, 14),
              gridColumn: !narrow && i === 0 ? 'span 1' : undefined,
            }}
          />
        ))}
      </div>
    );
  }

  // carousel (default)
  const cardW = narrow ? '78%' : 320;
  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <div
        ref={trackRef}
        role="region"
        aria-label="Publicaciones de Instagram"
        style={{
          display: 'flex',
          gap: narrow ? 10 : 16,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollPaddingInline: narrow ? 0 : 8,
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingBottom: 4,
          marginInline: narrow ? -4 : 0,
          paddingInline: narrow ? 4 : 0,
        }}
      >
        {items.map(m => (
          <div
            key={m.id}
            style={{
              flex: `0 0 ${typeof cardW === 'number' ? `${cardW}px` : cardW}`,
              scrollSnapAlign: 'start',
            }}
          >
            <Tile
              m={m}
              linkPosts={linkPosts}
              profileHref={profileHref}
              profileLabel={profileLabel}
              caption
              style={{
                aspectRatio: '4 / 5',
                borderRadius: r,
                boxShadow: `0 1px 0 ${line}, 0 18px 40px rgba(15,14,26,0.08)`,
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ver publicación ${i + 1}`}
              aria-current={i === idx}
              onClick={() => scrollTo(i)}
              style={{
                width: i === idx ? 22 : 8,
                height: 8,
                borderRadius: 999,
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: i === idx ? accent : line,
                transition: 'width .25s ease, background .2s ease',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <NavBtn
            label="Anterior"
            ink={ink}
            surface={surface}
            line={line}
            bg={bg}
            muted={muted}
            disabled={idx <= 0}
            onClick={() => scrollTo(Math.max(0, idx - 1))}
            flip
          />
          <NavBtn
            label="Siguiente"
            ink={ink}
            surface={surface}
            line={line}
            bg={bg}
            muted={muted}
            disabled={idx >= items.length - 1}
            onClick={() => scrollTo(Math.min(items.length - 1, idx + 1))}
          />
        </div>
      </div>
    </div>
  );
}

function NavBtn({
  label,
  onClick,
  disabled,
  ink,
  surface,
  line,
  bg,
  muted,
  flip,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  ink: string;
  surface: string;
  line: string;
  bg: string;
  muted: string;
  flip?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 40,
        height: 40,
        borderRadius: 999,
        border: `1px solid ${line}`,
        background: surface || bg,
        color: disabled ? muted : ink,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        style={{
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          transform: flip ? 'scaleX(-1)' : undefined,
        }}
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}
