'use client';

import { ChevronRight, Plus, Search, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { CAT_COLORS } from '@/lib/categories';
import { durLbl } from '@/lib/time';

export const catalogInputCls =
  'w-full min-w-0 rounded-field border-none bg-surface-soft px-4 text-body-lg font-semibold text-ink outline-none placeholder:text-ink-3 focus-visible:ring-2 focus-visible:ring-v/30';

export function fmtCatalogPrice(cents: number) {
  const euros = cents / 100;
  return euros === 0 ? 'Gratis' : `${euros.toFixed(0)} €`;
}

export function serviceMeta(durationMin: number, priceCents: number) {
  return `${durLbl(durationMin)} · ${fmtCatalogPrice(priceCents)}`;
}

export const DURATION_PRESETS = [15, 30, 45, 60, 90] as const;

export function durationPresetLabel(min: number) {
  if (min === 90) return '1h30';
  if (min >= 60) return `${min / 60}h`;
  return `${min}′`;
}

export function CatalogSearchField({
  value, onChange, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex h-[50px] items-center gap-2.5 rounded-field bg-surface-soft px-4">
      <Search size={18} className="shrink-0 text-ink-3" strokeWidth={2.2} aria-hidden />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 border-none bg-transparent text-body font-medium text-ink outline-none placeholder:text-ink-3"
      />
    </div>
  );
}

export function OutlinePillButton({
  children, onClick, className = '',
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-pill border-[1.5px] border-surface-line bg-surface-card px-3.5 text-label font-semibold text-ink motion-safe:active:scale-[.97] ${className}`}
    >
      {children}
    </button>
  );
}

export function SettingsToggleRow({
  title, hint, on, onToggle,
}: {
  title: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-3.5 rounded-field bg-surface-soft p-4 text-left motion-safe:active:scale-[.99]"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-body font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-label font-medium text-ink-2">{hint}</span>
      </span>
      <span
        className={`relative h-[30px] w-[50px] shrink-0 rounded-pill transition-colors ${on ? 'bg-ink' : 'bg-surface-line'}`}
        aria-hidden
      >
        <span
          className={`absolute top-[3px] h-6 w-6 rounded-pill bg-surface-card shadow transition-[left] ${on ? 'left-[23px]' : 'left-[3px]'}`}
        />
      </span>
    </button>
  );
}

export function PickChip({
  active, onClick, children, className = '',
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-[42px] items-center gap-2 rounded-pill border-[1.5px] px-3.5 text-label font-semibold motion-safe:active:scale-[.97] ${
        active
          ? 'border-ink bg-ink text-white'
          : 'border-surface-line bg-surface-card text-ink'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function DurationChip({
  minutes, active, onClick,
}: {
  minutes: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <PickChip active={active} onClick={onClick} className="min-w-0 flex-1 justify-center px-2">
      {durationPresetLabel(minutes)}
    </PickChip>
  );
}

export function CatalogColorDots({
  value, onChange, inheritColor, inheritActive, onInherit,
}: {
  value: string;
  onChange: (c: string) => void;
  inheritColor?: string;
  inheritActive?: boolean;
  onInherit?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {onInherit && (
        <button
          type="button"
          onClick={onInherit}
          className={`inline-flex h-11 items-center gap-2 rounded-pill border-[2.5px] bg-surface-card px-3.5 text-label font-semibold ${
            inheritActive ? 'border-ink' : 'border-transparent'
          }`}
        >
          <span
            className="h-7 w-7 rounded-pill"
            style={{ background: inheritColor ?? '#ECEBF1' }}
          />
          Igual que la categoría
        </button>
      )}
      {CAT_COLORS.map(c => (
        <button
          key={c}
          type="button"
          aria-label={`Color ${c}`}
          onClick={() => onChange(c)}
          className={`flex h-11 w-11 items-center justify-center rounded-pill bg-surface-card motion-safe:active:scale-[.94] ${
            value === c ? 'border-[2.5px] border-ink' : 'border-[2.5px] border-transparent'
          }`}
        >
          <span className="h-[30px] w-[30px] rounded-pill" style={{ background: c }} />
        </button>
      ))}
    </div>
  );
}

export function CatalogGroupCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col rounded-card bg-surface-soft px-1 py-0">
      {children}
    </div>
  );
}

export function CatalogRowButton({
  onClick, accent, title, meta, badge, muted,
}: {
  onClick: () => void;
  accent?: string;
  title: string;
  meta: string;
  badge?: string;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-t border-surface-line px-3.5 py-3.5 text-left first:border-t-0 motion-safe:active:bg-surface-line/40"
    >
      {accent && (
        <span
          className="h-9 w-1 shrink-0 rounded-pill"
          style={{ background: accent }}
          aria-hidden
        />
      )}
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-body font-semibold ${muted ? 'text-ink-3' : 'text-ink'}`}>
          {title}
        </span>
        <span className="block truncate text-label font-medium text-ink-2">{meta}</span>
      </span>
      {badge && (
        <span className="shrink-0 rounded-pill bg-track px-2 py-1 text-micro font-semibold text-ink-2">
          {badge}
        </span>
      )}
      <ChevronRight size={16} className="shrink-0 text-ink-3" strokeWidth={2.4} aria-hidden />
    </button>
  );
}

export function CatalogEmptyRow({ children }: { children: ReactNode }) {
  return (
    <p className="px-3.5 py-4 text-label font-medium text-ink-3">{children}</p>
  );
}

export function CatalogDeleteLink({
  label, disabled, onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-2 px-1 py-1.5 text-label font-semibold text-danger-fg disabled:text-ink-3"
    >
      <Trash2 size={16} strokeWidth={2.2} aria-hidden />
      {label}
    </button>
  );
}

export function SheetField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-label font-semibold text-ink-2">{label}</span>
      {children}
    </label>
  );
}

export function SheetFooter({
  pending, canSave, saveLabel, onCancel, onSave,
}: {
  pending: boolean;
  canSave: boolean;
  saveLabel: string;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex gap-2.5">
      <button
        type="button"
        onClick={onCancel}
        className="h-14 shrink-0 rounded-pill bg-track px-5 text-body font-semibold text-ink"
      >
        Cancelar
      </button>
      <button
        type="button"
        disabled={pending || !canSave}
        onClick={onSave}
        className={`h-14 min-w-0 flex-1 rounded-pill text-body-lg font-bold ${
          canSave
            ? 'bg-grad text-white shadow-lift'
            : 'bg-track text-ink-3'
        }`}
      >
        {pending ? 'Guardando…' : saveLabel}
      </button>
    </div>
  );
}
