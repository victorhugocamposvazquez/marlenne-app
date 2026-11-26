'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export type FilterDropdownOption = { value: string; label: string };

export default function FilterDropdown({
  value,
  onChange,
  options,
  ariaLabel,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  options: FilterDropdownOption[];
  ariaLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find(o => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => setOpen(o => !o)}
        className="flex h-10 w-full min-w-0 items-center justify-between gap-1 rounded-field bg-surface-soft px-2.5 text-left text-label font-semibold text-ink"
      >
        <span className="min-w-0 truncate">{selected?.label}</span>
        <ChevronDown
          size={16}
          strokeWidth={2.2}
          className={`shrink-0 text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-40 max-h-[min(50dvh,280px)] overflow-y-auto overscroll-contain rounded-row bg-surface-card py-1 shadow-lift ring-1 ring-surface-line"
        >
          {options.map(opt => {
            const on = opt.value === value;
            return (
              <li key={opt.value || '__all__'} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`flex min-h-[44px] w-full items-center justify-between gap-2 px-3 text-left text-label ${
                    on ? 'font-bold text-ink' : 'font-medium text-ink-2'
                  }`}
                >
                  <span className="min-w-0 truncate">{opt.label}</span>
                  {on && <Check size={16} strokeWidth={2.4} className="shrink-0" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}