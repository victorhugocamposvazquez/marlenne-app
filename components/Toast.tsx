'use client';

import { createContext, useCallback, useContext, useState } from 'react';

type Kind = 'ok' | 'err';
type Undo = () => void;
type Opts = { kind?: Kind; undo?: Undo };
type Toast = { id: number; message: string; kind: Kind; undo?: Undo };

const ToastCtx = createContext<(message: string, kindOrOpts?: Kind | Opts) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((message: string, kindOrOpts?: Kind | Opts) => {
    const opts = kindOrOpts === 'ok' || kindOrOpts === 'err'
      ? { kind: kindOrOpts }
      : (kindOrOpts ?? {});
    const id = Date.now() + Math.random();
    const kind = opts.kind ?? 'ok';
    setItems(prev => [...prev, { id, message, kind, undo: opts.undo }]);
    window.setTimeout(() => dismiss(id), opts.undo ? 6000 : 3200);
  }, [dismiss]);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 px-4">
        {items.map(t => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex max-w-[400px] items-center gap-3 rounded-[16px] px-4 py-3 shadow-toast animate-toastIn ${
              t.kind === 'err' ? 'bg-pink-600' : 'bg-ink'
            }`}
          >
            <p className="min-w-0 flex-1 text-[13px] font-bold text-white">
              {t.message}
            </p>
            {t.undo && (
              <button
                type="button"
                onClick={() => {
                  const run = t.undo;
                  dismiss(t.id);
                  run?.();
                }}
                className="shrink-0 text-[13px] font-extrabold text-[#DDD6FE]"
              >
                Deshacer
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
