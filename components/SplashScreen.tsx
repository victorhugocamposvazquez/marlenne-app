'use client';

import { useEffect, useState } from 'react';
import { BRAND_NAME, BRAND_UI, SPLASH_SEEN_KEY } from '@/lib/brand';

const MIN_MS = 900;
const FADE_MS = 380;

/**
 * Splash blanco de la pestaña (Safari). En PWA standalone no se pinta:
 * iOS/Android ya muestran apple-touch-startup-image / background_color.
 */
export default function SplashScreen() {
  const [phase, setPhase] = useState<'in' | 'out' | 'gone'>('in');

  useEffect(() => {
    if (typeof document !== 'undefined' && document.documentElement.dataset.booted === '1') {
      setPhase('gone');
      return;
    }
    try {
      if (sessionStorage.getItem(SPLASH_SEEN_KEY)) {
        setPhase('gone');
        return;
      }
    } catch {
      /* private mode */
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let fadeTimer = 0;
    const hide = () => {
      try { sessionStorage.setItem(SPLASH_SEEN_KEY, '1'); } catch { /* */ }
      document.documentElement.dataset.booted = '1';
      if (reduce) {
        setPhase('gone');
        return;
      }
      setPhase('out');
      fadeTimer = window.setTimeout(() => setPhase('gone'), FADE_MS);
    };

    const minTimer = window.setTimeout(hide, MIN_MS);
    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(fadeTimer);
    };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div
      id="marlenne-splash"
      role="status"
      aria-live="polite"
      aria-label={`Cargando ${BRAND_NAME}`}
      data-leaving={phase === 'out' ? 'true' : 'false'}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: BRAND_UI.splashBg,
        pointerEvents: phase === 'out' ? 'none' : 'auto',
      }}
    >
      <img
        src="/logo.png"
        alt=""
        width={112}
        height={112}
        draggable={false}
        style={{
          width: 112,
          height: 112,
          filter: 'drop-shadow(0 12px 28px rgba(182, 33, 200, .18))',
        }}
      />
      <p
        style={{
          margin: '22px 0 0',
          color: '#1E1630',
          fontWeight: 800,
          fontSize: 22,
          letterSpacing: '-0.03em',
        }}
      >
        {BRAND_NAME}
      </p>
    </div>
  );
}
