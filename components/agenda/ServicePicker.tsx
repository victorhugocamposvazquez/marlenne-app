'use client';

import { useEffect, useMemo, useState, type Ref } from 'react';
import { Check, Search } from 'lucide-react';
import { inputCls } from '@/components/Sheet';
import { catStyle } from '@/lib/categories';
import { servicePickSections, serviceShortcuts } from '@/lib/service-pick';
import { durLbl } from '@/lib/time';
import type { ServiceOption } from '@/lib/types';

export default function ServicePicker({
  open, services, lastId, counts, selectedId, initialQuery = '', onPick, inputRef, nudge, fill,
}: {
  open: boolean;
  services: ServiceOption[];
  lastId?: string | null;
  counts?: Record<string, number>;
  selectedId?: string;
  initialQuery?: string;
  onPick: (id: string) => void;
  onClose?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  nudge?: boolean;
  fill?: boolean;
}) {
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
  }, [open, initialQuery]);

  const shortcuts = useMemo(
    () => serviceShortcuts(services, { lastId, counts }),
    [services, lastId, counts],
  );
  const sections = useMemo(
    () => servicePickSections(services, { lastId, counts, query }),
    [services, lastId, counts, query],
  );
  const catalog = query.trim()
    ? sections
    : sections.filter(sec => sec.key !== 'last' && sec.key !== 'frequent');

  if (!open) return null;

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-field border bg-surface-bg ${
        fill ? 'min-h-0 flex-1' : 'mb-2 max-h-[34vh]'
      } ${nudge ? 'border-v ring-2 ring-v/40' : 'border-surface-line'}`}
      role="listbox"
      aria-label="Elegir servicio"
    >
      <div className="shrink-0 border-b border-surface-line p-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" strokeWidth={2.2} />
          <input
            ref={inputRef}
            autoFocus={open}
            className={`${inputCls} pl-9 py-2`}
            placeholder="Buscar un servicio"
            aria-label="Buscar servicio"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        {!query.trim() && (
          <p className="mt-1.5 px-0.5 text-caption font-semibold text-ink-2">
            {services.length} servicios · desliza o busca
          </p>
        )}
        {shortcuts.length > 0 && !query.trim() && (
          <div className="-mx-0.5 mt-2 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5">
            {shortcuts.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => onPick(s.id)}
                className={`shrink-0 rounded-pill px-3 py-2 text-label font-bold ${
                  s.id === selectedId
                    ? 'bg-grad text-white shadow-pill'
                    : 'border border-surface-line bg-surface-card text-ink-2'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {catalog.length === 0 ? (
          <p className="px-3 py-4 text-center text-caption font-semibold text-ink-2">
            No hay ningún servicio con «{query.trim()}».
          </p>
        ) : catalog.map(sec => (
          <section key={sec.key}>
            <h3 className="sticky top-0 bg-surface-bg px-3 py-1.5 text-caption font-bold uppercase tracking-[.03em] text-ink-2">
              {sec.title}
            </h3>
            {sec.items.map(s => {
              const cat = catStyle(s.category, { label: s.category_label, color: s.category_color });
              const on = s.id === selectedId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onPick(s.id)}
                  className="flex w-full min-h-[44px] items-center gap-2.5 border-t border-surface-line px-3 py-2 text-left"
                >
                  <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: cat.color }} />
                  <span className="min-w-0 flex-1 truncate text-label font-bold">{s.name}</span>
                  <span className="shrink-0 text-caption font-semibold tabular-nums text-ink-2">
                    {durLbl(s.duration_min)}
                  </span>
                  {on && <Check size={16} strokeWidth={2.4} className="shrink-0 text-v" />}
                </button>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
