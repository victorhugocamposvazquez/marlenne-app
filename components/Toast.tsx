'use client';

import { createContext, useCallback, useContext, useState } from 'react';

type Kind = 'ok' | 'err';
type Undo = () => void;

export type CitaToast = {
  mode: 'created' | 'modified';
  client: string;
  date: string;
  time: string;
  treatment: string;
};

export type MiembroToast = {
  name: string;
  email: string;
  role: string;
  password: string;
};

type Opts = { kind?: Kind; undo?: Undo; cita?: CitaToast; miembro?: MiembroToast };

type ToastBase = { id: number; kind: Kind; undo?: Undo };
type TextToast = ToastBase & { type: 'text'; message: string };
type CitaToastItem = ToastBase & { type: 'cita'; cita: CitaToast };
type MiembroToastItem = ToastBase & { type: 'miembro'; miembro: MiembroToast };
type RichToast = CitaToastItem | MiembroToastItem;
type Toast = TextToast | RichToast;

const ToastCtx = createContext<(message: string, kindOrOpts?: Kind | Opts) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

function CitaCard({ cita }: { cita: CitaToast }) {
  const title = cita.mode === 'created' ? 'Cita creada' : 'Cita modificada';
  return (
    <div className="min-w-0 flex-1">
      <p className="text-body font-extrabold text-ink">{title}</p>
      <p className="mt-1.5 text-body-lg font-bold text-ink">{cita.client}</p>
      <p className="mt-0.5 text-body text-ink-2">{cita.date} · {cita.time}</p>
      <p className="mt-0.5 text-body text-ink-2">{cita.treatment}</p>
    </div>
  );
}

function MiembroCard({ miembro }: { miembro: MiembroToast }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-body font-extrabold text-ink">Acceso creado</p>
      <p className="mt-1.5 text-body-lg font-bold text-ink">{miembro.name}</p>
      <p className="mt-0.5 text-body text-ink-2">{miembro.email} · {miembro.role}</p>
      <p className="mt-0.5 text-body text-ink-2">
        Contraseña temporal: <span className="font-bold tabular-nums text-ink">{miembro.password}</span>
      </p>
    </div>
  );
}

function isRichToast(t: Toast): t is RichToast {
  return t.type === 'cita' || t.type === 'miembro';
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
    const base = { id, kind, undo: opts.undo };
    const item: Toast = opts.cita
      ? { ...base, type: 'cita', cita: opts.cita }
      : opts.miembro
        ? { ...base, type: 'miembro', miembro: opts.miembro }
        : { ...base, type: 'text', message };
    setItems(prev => [...prev, item]);
    const richMs = opts.miembro ? 8000 : opts.cita ? 4800 : 3200;
    window.setTimeout(() => dismiss(id), opts.undo ? 6000 : richMs);
  }, [dismiss]);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] standalone:bottom-[calc(76px+max(6px,calc(env(safe-area-inset-bottom)-12px)))] z-[70] flex flex-col items-center gap-2 px-4">
        {items.map(t => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-[400px] items-start gap-3 rounded-card px-4 py-3.5 animate-toastIn ${
              isRichToast(t)
                ? 'border border-surface-line bg-surface-card shadow-lift'
                : t.kind === 'err'
                  ? 'bg-danger shadow-toast'
                  : 'bg-toast shadow-toast'
            }`}
          >
            {t.type === 'cita' ? (
              <CitaCard cita={t.cita} />
            ) : t.type === 'miembro' ? (
              <MiembroCard miembro={t.miembro} />
            ) : (
              <p className={`min-w-0 flex-1 text-body font-bold ${t.kind === 'err' ? 'text-white' : 'text-toast-fg'}`}>
                {t.message}
              </p>
            )}
            {t.undo && (
              <button
                type="button"
                onClick={() => {
                  const run = t.undo;
                  dismiss(t.id);
                  run?.();
                }}
                className={`shrink-0 text-body font-extrabold ${
                  isRichToast(t) ? 'text-v-2' : t.kind === 'err' ? 'text-white' : 'text-toast-accent'
                }`}
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
