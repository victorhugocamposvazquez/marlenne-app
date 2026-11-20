'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OfflineBanner() {
  const router = useRouter();
  const [off, setOff] = useState(false);

  useEffect(() => {
    const show = () => setOff(true);
    const hide = () => {
      setOff(false);
      router.refresh();
    };
    setOff(!navigator.onLine);
    window.addEventListener('offline', show);
    window.addEventListener('online', hide);
    return () => {
      window.removeEventListener('offline', show);
      window.removeEventListener('online', hide);
    };
  }, [router]);

  if (!off) return null;
  return (
    <p className="shrink-0 bg-ink px-4 py-2 text-center text-[13px] font-semibold text-white">
      Sin conexión. Ves la última copia.
    </p>
  );
}
