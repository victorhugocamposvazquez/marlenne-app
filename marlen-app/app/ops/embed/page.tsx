'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { EMBED_PANEL_STORAGE } from '@/lib/embed-panel';

function OpsEmbedInner() {
  const sp = useSearchParams();
  const token = sp.get('t')?.trim() ?? '';
  const [needTap, setNeedTap] = useState(false);
  const [busy, setBusy] = useState(false);

  const enterUrl = token
    ? `/ops/enter?t=${encodeURIComponent(token)}&embed=1`
    : null;

  const goEnter = useCallback(() => {
    if (!enterUrl) return;
    setBusy(true);
    window.location.replace(enterUrl);
  }, [enterUrl]);

  useEffect(() => {
    if (!enterUrl) return;
    try {
      sessionStorage.setItem(EMBED_PANEL_STORAGE, '1');
    } catch {
      /* ignore */
    }

    if (window.self === window.top) {
      goEnter();
      return;
    }

    const hasApi = typeof document.hasStorageAccess === 'function'
      && typeof document.requestStorageAccess === 'function';
    if (!hasApi) {
      goEnter();
      return;
    }

    void document.hasStorageAccess().then(has => {
      if (has) goEnter();
      else setNeedTap(true);
    }).catch(() => setNeedTap(true));
  }, [enterUrl, goEnter]);

  const onTap = async () => {
    if (!enterUrl) return;
    setBusy(true);
    try {
      if (typeof document.requestStorageAccess === 'function') {
        await document.requestStorageAccess();
      }
    } catch {
      /* Safari puede pedir otro intento */
    }
    goEnter();
  };

  if (!token) {
    return (
      <p className="px-6 text-center text-[14px] font-semibold text-ink-2">
        Enlace de soporte incompleto. Vuelve a abrir modo soporte en el panel.
      </p>
    );
  }

  if (!needTap) {
    return (
      <p className="px-6 text-center text-[14px] text-ink-2">
        {busy ? 'Entrando en la app del centro…' : 'Preparando sesión…'}
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-[320px] flex-col items-center gap-4 px-6 text-center">
      <p className="text-[15px] font-semibold leading-snug text-ink">
        Para ver la app dentro del panel, Safari necesita un toque tuyo (cookies en iframe).
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void onTap()}
        className="inline-flex h-11 w-full items-center justify-center rounded-pill bg-brand-pink px-5 text-[14px] font-bold text-white disabled:opacity-60"
      >
        {busy ? 'Entrando…' : 'Entrar en la app del centro'}
      </button>
    </div>
  );
}

export default function OpsEmbedPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-surface-bg">
      <Suspense fallback={<p className="text-[14px] text-ink-2">Cargando…</p>}>
        <OpsEmbedInner />
      </Suspense>
    </div>
  );
}
