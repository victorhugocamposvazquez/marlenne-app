'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || Boolean(nav.standalone)
  );
}

/** Recarga la vista (RSC). En PWA de escritorio no hay chrome del navegador. */
export function usePageRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [spinning, setSpinning] = useState(false);

  const refresh = useCallback(() => {
    setSpinning(true);
    startTransition(() => {
      router.refresh();
    });
    // Si hace falta un hard reload (SW nuevo), el usuario puede mantener pulsado → location.reload
    window.setTimeout(() => setSpinning(false), 700);
  }, [router]);

  const hardReload = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (e.key === 'F5' || (mod && (e.key === 'r' || e.key === 'R'))) {
        // En PWA instalada el chrome no refresca; lo hacemos nosotros.
        if (!isStandalonePwa() && !mod && e.key === 'F5') return;
        if (!isStandalonePwa() && mod) {
          // En pestaña normal dejamos el reload del navegador.
          return;
        }
        e.preventDefault();
        if (e.shiftKey) hardReload();
        else refresh();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [refresh, hardReload]);

  return { refresh, hardReload, busy: pending || spinning };
}

export default function RefreshButton({
  className = '',
  rail = false,
}: {
  className?: string;
  /** Icono redondo para SideNav */
  rail?: boolean;
}) {
  const { refresh, hardReload, busy } = usePageRefresh();

  return (
    <button
      type="button"
      aria-label="Actualizar página"
      title="Actualizar (F5). Mayús+clic o Mayús+F5: recarga completa"
      disabled={busy}
      onClick={e => {
        if (e.shiftKey) hardReload();
        else refresh();
      }}
      className={
        rail
          ? `grid h-11 w-11 place-items-center rounded-[13px] text-ink-2 transition-colors hover:bg-surface-soft disabled:opacity-50 ${className}`
          : className
      }
    >
      <RefreshCw
        size={rail ? 20 : 18}
        strokeWidth={1.9}
        className={busy ? 'motion-safe:animate-spin' : undefined}
      />
    </button>
  );
}
