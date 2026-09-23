'use client';

import { useEffect } from 'react';

export default function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const nudge = () => {
      void navigator.serviceWorker.register('/sw.js').then(reg => {
        void reg.update().catch(() => undefined);
      }).catch(() => undefined);
    };
    nudge();
    const onVis = () => {
      if (document.visibilityState === 'visible') nudge();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pageshow', nudge);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pageshow', nudge);
    };
  }, []);
  return null;
}
