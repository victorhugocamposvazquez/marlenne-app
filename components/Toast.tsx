'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { Calendar, Check, Clock, KeyRound, Mail, Scissors, User, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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

function isRichToast(t: Toast): t is RichToast {
  return t.type === 'cita' || t.type === 'miembro';
}

function DetailRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-icon bg-v-soft text-v">
        <Icon size={18} strokeWidth={2.2} aria-hidden />
      </span>
      <span className="min-w-0 py-1.5">
        <span className="block text-caption font-bold uppercase tracking-[.04em] text-ink-3">{label}</span>
        <span className="mt-0.5 block text-body-lg font-bold leading-snug text-ink">{value}</span>
      </span>
    </div>
  );
}

function PopupShell({
  title, icon: Icon, iconTone = 'grad', onDismiss, undo, onUndo, children,
}: {
  title: string;
  icon: LucideIcon;
  iconTone?: 'grad' | 'ok';
  onDismiss: () => void;
  undo?: Undo;
  onUndo?: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onDismiss}
        className="fixed inset-0 z-[88] animate-fadeIn bg-ink/40 backdrop-blur-[3px]"
      />
      <div className="pointer-events-none fixed inset-0 z-[89] flex items-center justify-center p-5">
        <div
          role="status"
          className="pointer-events-auto w-full max-w-[360px] overflow-hidden rounded-sheet bg-surface-card shadow-popup animate-modalIn"
        >
          <div className="h-1 bg-grad" />
          <div className="relative px-5 pb-5 pt-6">
            <button
              type="button"
              aria-label="Cerrar"
              onClick={onDismiss}
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-pill bg-surface-soft text-ink-2 motion-safe:active:scale-[.96]"
            >
              <X size={16} strokeWidth={2.4} />
            </button>
            <div className="flex flex-col items-center text-center">
              <span className={`mb-3 grid h-[52px] w-[52px] place-items-center rounded-full text-white ${iconTone === 'ok' ? 'bg-ok' : 'bg-grad'}`}>
                <Icon size={24} strokeWidth={2.4} aria-hidden />
              </span>
              <h2 className="text-title font-bold tracking-[-.02em] text-ink">{title}</h2>
            </div>
            <div className="mt-5 flex flex-col gap-3.5 border-t border-surface-line pt-5">
              {children}
            </div>
            {(undo || onUndo) && (
              <button
                type="button"
                onClick={onUndo}
                className="mt-5 flex min-h-[44px] w-full items-center justify-center rounded-pill bg-v-soft text-body font-extrabold text-v-d motion-safe:active:scale-[.98]"
              >
                Deshacer
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function CitaPopup({ cita, onDismiss, undo }: { cita: CitaToast; onDismiss: () => void; undo?: Undo }) {
  const title = cita.mode === 'created' ? 'Cita creada' : 'Cita modificada';
  return (
    <PopupShell
      title={title}
      icon={Check}
      iconTone="ok"
      onDismiss={onDismiss}
      undo={undo}
      onUndo={undo ? () => { onDismiss(); undo(); } : undefined}
    >
      <DetailRow icon={User} label="Clienta" value={cita.client} />
      <DetailRow icon={Calendar} label="Día" value={cita.date} />
      <DetailRow icon={Clock} label="Hora" value={cita.time} />
      <DetailRow icon={Scissors} label="Tratamiento" value={cita.treatment} />
    </PopupShell>
  );
}

function MiembroPopup({ miembro, onDismiss }: { miembro: MiembroToast; onDismiss: () => void }) {
  return (
    <PopupShell title="Acceso creado" icon={Check} onDismiss={onDismiss}>
      <DetailRow icon={User} label="Nombre" value={miembro.name} />
      <DetailRow icon={Mail} label="Email" value={miembro.email} />
      <DetailRow icon={User} label="Rol" value={miembro.role} />
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-icon bg-v-soft text-v">
          <KeyRound size={18} strokeWidth={2.2} aria-hidden />
        </span>
        <span className="min-w-0 py-1.5">
          <span className="block text-caption font-bold uppercase tracking-[.04em] text-ink-3">Contraseña temporal</span>
          <span className="mt-1.5 inline-block rounded-field bg-surface-soft px-3 py-2 text-body-lg font-bold tabular-nums tracking-wide text-ink">
            {miembro.password}
          </span>
        </span>
      </div>
    </PopupShell>
  );
}

function TextToastCard({ t, onDismiss }: { t: TextToast; onDismiss: () => void }) {
  const err = t.kind === 'err';
  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-full max-w-[340px] items-center gap-3 rounded-card px-4 py-3.5 shadow-popup animate-modalIn ${
        err ? 'bg-danger text-white' : 'border border-surface-line bg-surface-card'
      }`}
    >
      <p className={`min-w-0 flex-1 text-body font-bold ${err ? 'text-white' : 'text-ink'}`}>
        {t.message}
      </p>
      {t.undo ? (
        <button
          type="button"
          onClick={() => {
            const run = t.undo;
            onDismiss();
            run?.();
          }}
          className={`shrink-0 text-body font-extrabold ${err ? 'text-white/90' : 'text-v-2'}`}
        >
          Deshacer
        </button>
      ) : (
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onDismiss}
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-pill ${err ? 'text-white/80' : 'text-ink-3'}`}
        >
          <X size={16} strokeWidth={2.4} />
        </button>
      )}
    </div>
  );
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
    const richMs = opts.miembro ? 8000 : opts.cita ? 5500 : 3200;
    window.setTimeout(() => dismiss(id), opts.undo ? 6000 : richMs);
  }, [dismiss]);

  const rich = items.filter(isRichToast);
  const plain = items.filter((t): t is TextToast => !isRichToast(t));

  return (
    <ToastCtx.Provider value={push}>
      {children}
      {rich.map(t => (
        t.type === 'cita' ? (
          <CitaPopup key={t.id} cita={t.cita} onDismiss={() => dismiss(t.id)} undo={t.undo} />
        ) : (
          <MiembroPopup key={t.id} miembro={t.miembro} onDismiss={() => dismiss(t.id)} />
        )
      ))}
      {plain.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-[87] flex flex-col items-center justify-center gap-2 p-5">
          {plain.map(t => (
            <TextToastCard key={t.id} t={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </div>
      )}
    </ToastCtx.Provider>
  );
}
