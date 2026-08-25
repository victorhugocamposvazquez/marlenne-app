'use client';

import { createContext, useCallback, useContext, useState } from 'react';

type Kind = 'ok' | 'err';
type Toast = { id: number; message: string; kind: Kind };

const ToastCtx = createContext<(message: string, kind?: Kind) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((message: string, kind: Kind = 'ok') => {
    const id = Date.now() + Math.random();
    setItems(prev => [...prev, { id, message, kind }]);
    window.setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 3200);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4">
        {items.map(t => (
          <p
            key={t.id}
            role="status"
            className={`animate-toastIn max-w-[400px] rounded-[16px] px-4 py-3 text-center text-[13px] font-bold text-white shadow-toast ${
              t.kind === 'err' ? 'bg-pink-600' : 'bg-ink'
            }`}
          >
            {t.message}
          </p>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
