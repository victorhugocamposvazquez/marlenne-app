'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import NewClientSheet from '@/components/clienta/NewClientSheet';
import Chip from '@/components/ui/Chip';
import EmptyState from '@/components/ui/EmptyState';
import IconButton, { pillOutlineCls } from '@/components/ui/IconButton';
import Badge from '@/components/ui/Badge';
import PageHeading from '@/components/ui/PageHeading';
import { shallowSet, useShallowParam } from '@/hooks/useShallowQuery';
import { avatarColor, initials } from '@/lib/categories';
import { phoneDigits } from '@/lib/phone';
import { isRecallDue, shortWhen } from '@/lib/time';
import { fold } from '@/lib/voice';
import type { ClientListRow } from '@/lib/types';

type Filter = 'todas' | 'vip' | 'proxima' | 'sin' | 'tratamiento' | 'volver' | 'bono';
type Sort = 'az' | 'za' | 'alta' | 'visitas';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'proxima', label: 'Con cita' },
  { id: 'sin', label: 'Sin próxima' },
  { id: 'volver', label: 'Por volver' },
  { id: 'tratamiento', label: 'En curso' },
  { id: 'bono', label: 'Con bono' },
  { id: 'vip', label: 'VIP' },
];

const SORTS: { id: Sort; label: string }[] = [
  { id: 'az', label: 'A–Z' },
  { id: 'za', label: 'Z–A' },
  { id: 'alta', label: 'Última alta' },
  { id: 'visitas', label: 'Más visitas' },
];

function byName(a: ClientListRow, b: ClientListRow) {
  return fold(a.full_name).localeCompare(fold(b.full_name), 'es');
}

function clientListMeta(c: ClientListRow) {
  const phone = c.phone?.trim() || 'Sin teléfono';
  const ctx = c.next_at
    ? `Próxima ${shortWhen(c.next_at)}`
    : c.open_packs?.length
      ? c.open_packs[0]
      : c.last_at
        ? `Última ${shortWhen(c.last_at)}`
        : c.open_treatments?.length
          ? c.open_treatments.join(' · ')
          : 'Nunca ha venido';
  return { phone, ctx, hasPhone: !!c.phone?.trim() };
}

export default function ClientasView({
  clients, initialAlta,
}: {
  clients: ClientListRow[];
  initialAlta?: boolean;
}) {
  const alta = useShallowParam('alta', initialAlta ? '1' : null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('todas');
  const [sort, setSort] = useState<Sort>('az');
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortOpen) return;
    const onDoc = (e: PointerEvent) => {
      if (!sortRef.current?.contains(e.target as Node)) setSortOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSortOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [sortOpen]);

  const sortLabel = SORTS.find(s => s.id === sort)?.label ?? 'A–Z';

  const shown = useMemo(() => {
    const needle = fold(q);
    const tel = phoneDigits(q);
    const filtered = clients.filter(c => {
      if (filter === 'vip' && !c.tags.includes('VIP')) return false;
      if (filter === 'proxima' && !c.next_at) return false;
      if (filter === 'sin' && c.next_at) return false;
      if (filter === 'tratamiento' && !c.open_treatments.length) return false;
      if (filter === 'bono' && !c.open_packs.length) return false;
      if (filter === 'volver' && !isRecallDue(c.last_at, c.next_at)) return false;
      if (!needle && tel.length < 3) return true;
      const nameHit = needle && fold(c.full_name).includes(needle);
      const phoneHit = tel.length >= 3 && phoneDigits(c.phone ?? '').includes(tel);
      return !!(nameHit || phoneHit);
    });
    return [...filtered].sort((a, b) => {
      if (sort === 'za') return byName(b, a);
      if (sort === 'alta') {
        const byDate = (b.created_at ?? '').localeCompare(a.created_at ?? '');
        return byDate || byName(a, b);
      }
      if (sort === 'visitas') {
        const byVisits = (b.visit_count ?? 0) - (a.visit_count ?? 0);
        return byVisits || byName(a, b);
      }
      return byName(a, b);
    });
  }, [clients, q, filter, sort]);

  const titleCount = shown.length === clients.length
    ? `${clients.length} fichas`
    : `${shown.length} de ${clients.length}`;

  return (
    <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 px-6 pb-2 pt-5">
        <PageHeading title="Clientas" subtitle={titleCount}>
          <IconButton
            label="Nueva Client@"
            tone="outline"
            className="h-12 w-12 rounded-pill"
            onClick={() => shallowSet({ alta: '1' })}
          >
            <Plus size={22} strokeWidth={2.2} />
          </IconButton>
        </PageHeading>
        <div ref={sortRef} className="relative mt-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-body font-bold text-ink">Ordenar por:</span>
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
              aria-label={`Ordenar por ${sortLabel}`}
              onClick={() => setSortOpen(o => !o)}
              className="inline-flex items-center gap-0.5 text-body font-semibold text-ink"
            >
              {sortLabel}
              <ChevronDown size={16} strokeWidth={2.2} className={sortOpen ? 'rotate-180' : ''} aria-hidden />
            </button>
          </div>
          {sortOpen && (
            <ul
              role="listbox"
              aria-label="Ordenar clientas"
              className="absolute left-0 top-full z-20 min-w-[11.5rem] overflow-hidden rounded-row bg-surface-card py-1 shadow-lift ring-1 ring-surface-line"
            >
              {SORTS.map(s => {
                const on = s.id === sort;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={on}
                      onClick={() => { setSort(s.id); setSortOpen(false); }}
                      className={`flex min-h-[44px] w-full items-center justify-between gap-3 px-3.5 text-left text-body ${
                        on ? 'font-bold text-ink' : 'font-medium text-ink-2'
                      }`}
                    >
                      {s.label}
                      {on && <Check size={16} strokeWidth={2.4} className="shrink-0 text-ink" aria-hidden />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="mt-2 flex h-[54px] items-center gap-2.5 rounded-field bg-surface-soft px-4">
          <Search size={18} className="text-ink-3" strokeWidth={2.2} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar por nombre o teléfono"
            aria-label="Buscar clientas"
            className="flex-1 border-0 bg-transparent text-[16px] outline-none placeholder:text-ink-3"
          />
        </div>
        <div className="mt-2 flex gap-1.5 overflow-x-auto">
          {FILTERS.map(f => (
            <Chip
              key={f.id}
              className="shrink-0"
              active={filter === f.id}
              onClick={() => setFilter(prev => (prev === f.id ? 'todas' : f.id))}
            >
              {f.label}
            </Chip>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-6 pb-fab pt-1">
        {shown.length === 0 && (
          <EmptyState
            icon={Search}
            title={clients.length === 0
              ? 'Todavía no hay clientas.'
              : q
                ? 'Ninguna clienta coincide con esa búsqueda.'
                : 'Ninguna clienta en este filtro.'}
            hint={clients.length === 0 ? 'El alta está arriba, a la derecha.' : undefined}
          />
        )}
        {shown.map(c => {
          const { phone, ctx, hasPhone } = clientListMeta(c);
          return (
            <div
              key={c.id}
              className="flex items-center gap-3 border-b border-surface-line py-3.5"
            >
              <Link href={`/clientas/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[14px] font-bold text-white"
                  style={{ background: avatarColor(c.full_name) }}
                >
                  {initials(c.full_name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-body-lg font-semibold">{c.full_name}</span>
                    {c.tags?.includes('VIP') && (
                      <Badge tone="brand" className="shrink-0">VIP</Badge>
                    )}
                  </span>
                  <span className={`block text-label ${hasPhone ? 'font-semibold text-ink' : 'font-medium text-ink-2'}`}>
                    {phone}
                  </span>
                  <span className="block truncate text-label text-ink-3">{ctx}</span>
                </span>
              </Link>
              <Link
                href={`/agenda?new=1&client=${c.id}`}
                aria-label={`Dar cita a ${c.full_name}`}
                className={`${pillOutlineCls} h-[38px] shrink-0 px-3.5 text-label font-semibold`}
              >
                Dar cita
              </Link>
            </div>
          );
        })}
      </div>
      {alta === '1' && (
        <NewClientSheet existing={clients.map(c => ({ id: c.id, full_name: c.full_name, phone: c.phone }))} />
      )}
    </div>
  );
}
