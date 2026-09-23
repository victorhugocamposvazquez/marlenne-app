'use client';

import { useCallback, useEffect, useState } from 'react';
import BrandLogo from '@/components/BrandLogo';
import Button from '@/components/ui/Button';
import { APP_BUILD } from '@/lib/app-build';

async function remoteBuild(): Promise<string> {
  const res = await fetch(`/app-build.txt?ts=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) return '';
  return (await res.text()).trim();
}

async function applyUpdate() {
  const reg = 'serviceWorker' in navigator
    ? await navigator.serviceWorker.getRegistration()
    : undefined;
  try { await reg?.update(); } catch { /* sin red */ }
  reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
  }
  const url = new URL(window.location.href);
  url.searchParams.set('_v', String(Date.now()));
  window.location.replace(url.toString());
}

export default function UpdatePrompt() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const look = useCallback(async () => {
    try {
      const remote = await remoteBuild();
      if (remote && remote !== APP_BUILD) {
        setOpen(true);
        return;
      }
    } catch { /* sin red, no interrumpir */ }
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.waiting && navigator.serviceWorker.controller) setOpen(true);
  }, []);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('_v') || url.searchParams.has('_upd')) {
        url.searchParams.delete('_v');
        url.searchParams.delete('_upd');
        const next = `${url.pathname}${url.search}${url.hash}`;
        window.history.replaceState(window.history.state, '', next);
      }
    } catch { /* */ }

    void look();
    const onVis = () => {
      if (document.visibilityState === 'visible') void look();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pageshow', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pageshow', onVis);
    };
  }, [look]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center bg-ink/45 p-6 backdrop-blur-[8px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="marlen-update-title"
        className="w-full max-w-[300px] overflow-hidden rounded-sheet bg-surface-card shadow-popup"
      >
        <div className="h-1 bg-grad" aria-hidden />
        <div className="flex flex-col items-center px-6 pb-6 pt-8">
          <BrandLogo size={96} alt="" />
          <h2 id="marlen-update-title" className="mt-5 text-headline font-bold tracking-[-0.03em] text-ink">
            Nueva versión
          </h2>
          <Button
            full
            size="lg"
            className="mt-6"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void applyUpdate();
            }}
          >
            Actualizar
          </Button>
        </div>
      </div>
    </div>
  );
}
