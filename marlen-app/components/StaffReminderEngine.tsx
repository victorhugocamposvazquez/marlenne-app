'use client';

import { useEffect } from 'react';
import { enableStaffPush, readStaffPushEnabled } from '@/hooks/staff-push';

const TICK_MS = 60_000;

/** Renueva la suscripción si ya hay permiso y pide al servidor los avisos pendientes. */
export default function StaffReminderEngine() {
  useEffect(() => {
    let alive = true;
    void (async () => {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      }
      const enabled = await readStaffPushEnabled();
      if (!alive || !enabled) return;
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        void enableStaffPush();
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let timer = 0;
    const tick = () => {
      void fetch('/api/staff-reminders/tick', { method: 'POST' });
    };
    const start = () => {
      window.clearInterval(timer);
      tick();
      timer = window.setInterval(tick, TICK_MS);
    };
    const stop = () => window.clearInterval(timer);
    const onVis = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return null;
}
