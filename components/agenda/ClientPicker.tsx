'use client';

import { type Ref } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { inputCls } from '@/components/Sheet';
import { avatarColor, initials } from '@/lib/categories';
import { filterClientOptions } from '@/lib/client-pick';
import type { ClientOption } from '@/lib/types';

export default function ClientPicker({
  clients, query, onQuery, onPick, inputRef, nudge, fill,
}: {
  clients: ClientOption[];
  query: string;
  onQuery: (q: string) => void;
  onPick: (c: ClientOption) => void;
  inputRef?: Ref<HTMLInputElement>;
  nudge?: boolean;
  fill?: boolean;
}) {
  const shown = filterClientOptions(clients, query);
  const canCreate = query.trim().length > 1 && shown.length === 0;

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-field border bg-surface-bg ${
        fill ? 'min-h-0 flex-1' : 'mb-2 max-h-[34vh]'
      } ${nudge ? 'border-v ring-2 ring-v/40' : 'border-surface-line'}`}
      role="listbox"
      aria-label="Elegir clienta o cliente"
    >
      <div className="shrink-0 border-b border-surface-line p-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" strokeWidth={2.2} />
          <input
            ref={inputRef}
            autoFocus
            className={`${inputCls} pl-9 py-2`}
            placeholder="Nombre o teléfono"
            aria-label="Buscar clienta o cliente"
            value={query}
            onChange={e => onQuery(e.target.value)}
          />
        </div>
        <p className="mt-1.5 px-0.5 text-caption font-semibold text-ink-2">
          {query.trim()
            ? (shown.length === 1 ? '1 coincidencia' : `${shown.length} coincidencias`)
            : `${clients.length} en la agenda · toca una`}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {canCreate ? (
          <p className="flex items-center gap-1.5 px-3 py-3 text-caption font-semibold text-ink-2">
            <UserPlus size={14} strokeWidth={2.2} className="text-v" />
            Se guardará como «{query.trim()}»
          </p>
        ) : shown.map(c => (
          <button
            key={c.id}
            type="button"
            role="option"
            onClick={() => onPick(c)}
            className="flex w-full min-h-[44px] items-center gap-2.5 border-t border-surface-line px-3 py-2 text-left"
          >
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-chip text-micro font-bold text-white"
              style={{ background: avatarColor(c.full_name) }}
            >
              {initials(c.full_name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-label font-bold">{c.full_name}</span>
              {c.phone && (
                <span className="block truncate text-caption font-semibold text-ink-2">{c.phone}</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
