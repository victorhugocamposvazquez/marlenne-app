'use client';

import { useEffect, useState } from 'react';

export type AppShellMode = 'phone' | 'wide';

const WIDE_MQ = '(min-width: 1024px)';

function isNativeShell(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as Window & { Capacitor?: unknown }).Capacitor,
  );
}

function readMode(): AppShellMode {
  if (isNativeShell()) return 'phone';
  if (typeof window.matchMedia !== 'function') return 'phone';
  return window.matchMedia(WIDE_MQ).matches ? 'wide' : 'phone';
}

/** Phone = Capacitor o viewport &lt; 1024. Wide = browser/PWA en tablet/escritorio. */
export function useAppShellMode(): AppShellMode {
  const [mode, setMode] = useState<AppShellMode>('phone');

  useEffect(() => {
    const apply = () => setMode(readMode());
    apply();
    const mq = window.matchMedia(WIDE_MQ);
    mq.addEventListener('change', apply);
    window.addEventListener('resize', apply);
    return () => {
      mq.removeEventListener('change', apply);
      window.removeEventListener('resize', apply);
    };
  }, []);

  return mode;
}

export function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
