'use client';

import { useSyncExternalStore } from 'react';

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

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia(WIDE_MQ);
  const handler = () => onChange();
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}

/** Phone = Capacitor o viewport &lt; 1024. Wide = browser/PWA en tablet/escritorio. */
export function useAppShellMode(): AppShellMode {
  return useSyncExternalStore(subscribe, readMode, () => 'phone');
}

export function useClientMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
