'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Search, X } from 'lucide-react';
import IconButton from '@/components/ui/IconButton';
import { inputCls } from '@/components/Sheet';
import { catStyle } from '@/lib/categories';
import { servicePickSections } from '@/lib/service-pick';
import { durLbl } from '@/lib/time';
import type { ServiceOption } from '@/lib/types';

export default function ServicePicker({
  open, services, lastId, counts, selectedId, initialQuery = '', onPick, onClose,
}: {
  open: boolean;
  services: ServiceOption[];
  lastId?: string | null;
  counts?: Record<string, number>;
  selectedId?: string;
  initialQuery?: string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [mounted, setMounted] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => searchRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [open, initialQuery, onClose]);

  const sections = useMemo(
    () => servicePickSections(services, { lastId, counts, query }),
    [services, lastId, counts, query],
  );

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-surface-bg"
      role="dialog"
      aria-modal="true"
      aria-label="Elegir servicio"
    >
      <div className="shrink-0 border-b border-surface-line px-3 pb-3 pt-[max(10px,env(safe-area-inset-top))]">
        <div className="mb-3 flex items-center gap-2">
          <p className="min-w-0 flex-1 text-body font-extrabold">Servicio</p>
          <IconButton label="Cerrar" tone="ghost" onClick={onClose}>
            <X size={18} strokeWidth={2.2} />
          </IconButton>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" strokeWidth={2.2} />
          <input
            ref={searchRef}
            className={`${inputCls} pl-9`}
            placeholder="Buscar servicio o categoría"
            aria-label="Buscar servicio"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
        {sections.length === 0 ? (
          <p className="px-2 py-6 text-center text-body font-semibold text-ink-2">
            No hay ningún servicio con «{query.trim()}».
          </p>
        ) : sections.map(sec => (
          <section key={sec.key} className="mb-5">
            <h3 className="mb-1.5 px-1 text-caption font-bold uppercase tracking-[.03em] text-ink-2">
              {sec.title}
            </h3>
            <div className="overflow-hidden rounded-field border border-surface-line bg-surface-card">
              {sec.items.map(s => {
                const cat = catStyle(s.category, { label: s.category_label, color: s.category_color });
                const on = s.id === selectedId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onPick(s.id)}
                    className="flex w-full min-h-[52px] items-center gap-3 border-b border-surface-line px-3.5 py-3 text-left last:border-0"
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: cat.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-bold">{s.name}</span>
                      <span className="block text-caption font-semibold text-ink-2">
                        {durLbl(s.duration_min)} · {(s.price_cents / 100).toFixed(0)} €
                      </span>
                    </span>
                    {on && <Check size={18} strokeWidth={2.4} className="shrink-0 text-v" />}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>,
    document.body,
  );
}
