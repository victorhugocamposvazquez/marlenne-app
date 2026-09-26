'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { EMBED_PANEL_STORAGE } from '@/lib/embed-panel';

/** Si falló la sesión en iframe, ofrece reintentar con Storage Access. */
function EmbedPanelHintInner() {
  const sp = useSearchParams();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (window.self === window.top) return;
    const embed = sp.get('embed') === '1'
      || sessionStorage.getItem(EMBED_PANEL_STORAGE) === '1';
    if (!embed) return;
    if (typeof document.requestStorageAccess !== 'function') return;

    void document.hasStorageAccess?.().then(has => {
      if (!has) setShow(true);
    }).catch(() => setShow(true));
  }, [sp]);

  if (!show) return null;

  return (
    <div className="shrink-0 border-b border-line bg-white px-4 py-2 text-center">
      <button
        type="button"
        className="text-[12px] font-semibold text-brand-pink underline"
        onClick={() => {
          void document.requestStorageAccess?.().then(() => {
            window.location.reload();
          }).catch(() => {
            window.location.reload();
          });
        }}
      >
        Activar sesión en el panel
      </button>
    </div>
  );
}

export default function EmbedPanelHint() {
  return (
    <Suspense fallback={null}>
      <EmbedPanelHintInner />
    </Suspense>
  );
}
