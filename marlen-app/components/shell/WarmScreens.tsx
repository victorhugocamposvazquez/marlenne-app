'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isSlowNetwork } from '@/hooks/net-client';

const SCREENS = ['/hoy', '/agenda', '/clientas', '/ajustes/servicios', '/tareas', '/finanzas', '/ajustes'];

/** Pide las pantallas del menú, una a una, para que queden guardadas sin recorrerlas. */
export default function WarmScreens({ role }: { role: string }) {
  const router = useRouter();

  useEffect(() => {
    if (!navigator.onLine || isSlowNetwork()) return;
    const screens = SCREENS.filter(href => {
      if (role === 'provider' && href === '/clientas') return false;
      if (role !== 'admin' && href === '/ajustes/servicios') return false;
      return true;
    });
    let stop = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        for (const href of screens) {
          if (stop || !navigator.onLine) return;
          router.prefetch(href);
          await new Promise(resolve => window.setTimeout(resolve, 500));
        }
      })();
    }, 1200);
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, [router, role]);

  return null;
}
