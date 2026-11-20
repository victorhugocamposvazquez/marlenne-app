'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, Loader2, Plus, Search, X } from 'lucide-react';
import { loadClientsPage, countClientSearch } from '@/app/actions/client-list';
import NewClientSheet from '@/components/clienta/NewClientSheet';
import LineSearch from '@/components/LineSearch';
import Chip from '@/components/ui/Chip';
import EmptyState from '@/components/ui/EmptyState';
import DarCitaLink from '@/components/ui/DarCitaLink';
import Badge from '@/components/ui/Badge';
import PageHeading from '@/components/ui/PageHeading';
import { HeaderIconButton, screenHeaderCls } from '@/components/ui/ScreenHeader';
import { shallowSet, useShallowParam } from '@/hooks/useShallowQuery';
import { avatarColor, initials } from '@/lib/categories';
import { phoneDigits } from '@/lib/phone';
import { isRecallDue, shortWhen } from '@/lib/time';
import { fold } from '@/lib/voice';
import { CLIENT_LIST_PAGE } from '@/lib/client-list-size';
import { setSearchFocusIsolate } from '@/lib/search-focus-isolate';
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

function mergeClients(prev: ClientListRow[], next: ClientListRow[]) {
  const seen = new Set(prev.map(c => c.id));
  const out = [...prev];
  for (const c of next) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      out.push(c);
    }
  }
  return out;
}

export default function ClientasView({
  initialClients,
  initialTotal,
  initialAlta,
}: {
  initialClients: ClientListRow[];
  initialTotal: number;
  initialAlta?: boolean;
}) {
  const alta = useShallowParam('alta', initialAlta ? '1' : null);
  const [clients, setClients] = useState(initialClients);
  const [total, setTotal] = useState(initialTotal);
  const [nextOffset, setNextOffset] = useState(initialClients.length);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [searchTotal, setSearchTotal] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>('todas');
  const [sort, setSort] = useState<Sort>('az');
  const [sortOpen, setSortOpen] = useState(false);
  const [loadingMore, startLoadMore] = useTransition();
  const sortRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLTextAreaElement>(null);
  const blurSearch = useRef(0);
  const [searching, setSearching] = useState(false);
  const searchGen = useRef(0);
  const prevSearch = useRef('');

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 280);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => () => window.clearTimeout(blurSearch.current), []);

  useEffect(() => {
    const root = document.documentElement;
    if (searching) root.dataset.searching = '1';
    else delete root.dataset.searching;
    setSearchFocusIsolate(searching);
    return () => {
      delete root.dataset.searching;
      setSearchFocusIsolate(false);
    };
  }, [searching]);

  const resetAndFetch = useCallback((query: string) => {
    const gen = ++searchGen.current;
    setSearchTotal(null);
    startLoadMore(async () => {
      const page = await loadClientsPage(0, undefined, query);
      if (gen !== searchGen.current) return;
      setClients(page.rows);
      setTotal(page.total);
      setNextOffset(page.nextOffset);
    });
  }, []);

  useEffect(() => {
    if (debouncedQ.length >= 2) {
      resetAndFetch(debouncedQ);
    } else if (prevSearch.current.length >= 2 && debouncedQ.length === 0) {
      setClients(initialClients);
      setTotal(initialTotal);
      setNextOffset(initialClients.length);
    }
    prevSearch.current = debouncedQ;
  }, [debouncedQ, resetAndFetch, initialClients, initialTotal]);

  useEffect(() => {
    if (debouncedQ.length < 2) {
      setSearchTotal(null);
      return;
    }
    let stop = false;
    const timer = window.setTimeout(() => {
      void countClientSearch(debouncedQ).then(n => {
        if (!stop) setSearchTotal(n);
      });
    }, 450);
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, [debouncedQ]);

  const hasMore = debouncedQ.length >= 2
    ? searchTotal != null
      ? nextOffset < searchTotal
      : nextOffset > 0 && nextOffset % CLIENT_LIST_PAGE === 0
    : nextOffset < total;

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    startLoadMore(async () => {
      const page = await loadClientsPage(nextOffset, undefined, debouncedQ.length >= 2 ? debouncedQ : undefined);
      setClients(prev => mergeClients(prev, page.rows));
      setTotal(page.total);
      setNextOffset(page.nextOffset);
    });
  }, [hasMore, loadingMore, nextOffset, debouncedQ]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '240px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadMore]);

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
      if (debouncedQ.length >= 2) return true;
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
  }, [clients, q, debouncedQ, filter, sort]);

  const titleCount = debouncedQ.length >= 2
    ? filter === 'todas' && searchTotal != null
      ? `${searchTotal} encontradas`
      : `${shown.length} encontradas`
    : clients.length < total
      ? `${clients.length} de ${total} fichas`
      : `${total} fichas`;

  const partialHint = filter !== 'todas' && clients.length < total
    ? 'Filtro sobre las fichas ya cargadas. Baja para traer más.'
    : null;

  const clearQuery = () => {
    setQ('');
    setDebouncedQ('');
    searchRef.current?.focus();
  };

  const closeSearch = () => {
    window.clearTimeout(blurSearch.current);
    setSearching(false);
    setQ('');
    setDebouncedQ('');
    searchRef.current?.blur();
  };

  return (
    <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
      <header
        className={`${screenHeaderCls}${searching ? ' sticky top-0 z-30 !pt-2 !pb-1 bg-surface-bg' : ''}`}
      >
        <div className="hide-when-keyboard">
          <PageHeading title="Clientas" subtitle={titleCount}>
            <HeaderIconButton label="Nueva Client@" onClick={() => shallowSet({ alta: '1' })}>
              <Plus size={22} strokeWidth={2.2} />
            </HeaderIconButton>
          </PageHeading>
        </div>
        <div ref={sortRef} className="hide-when-keyboard relative mt-1.5">
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
        <div role="search" className={`flex items-center gap-2 ${searching ? '' : 'mt-2'}`}>
          <div className="flex h-[54px] min-w-0 flex-1 items-center gap-2.5 rounded-field bg-surface-soft px-4">
            <Search size={18} className="shrink-0 text-ink-3" strokeWidth={2.2} />
            <LineSearch
              ref={searchRef}
              value={q}
              onChange={setQ}
              variant="plain"
              name="clientas-q"
              placeholder="Buscar"
              ariaLabel="Buscar clientas"
              className="h-6 min-w-0 flex-1 border-0 bg-transparent py-0 text-[16px] leading-6 outline-none placeholder:text-ink-3"
              onFocus={() => {
                window.clearTimeout(blurSearch.current);
                setSearching(true);
              }}
              onBlur={() => {
                blurSearch.current = window.setTimeout(() => setSearching(false), 300);
              }}
            />
            {q.length > 0 && (
              <button
                type="button"
                aria-label="Borrar lo escrito"
                className="grid h-8 w-8 shrink-0 place-items-center text-ink-3"
                onPointerDown={e => e.preventDefault()}
                onMouseDown={e => e.preventDefault()}
                onClick={clearQuery}
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            )}
          </div>
          {searching && (
            <button
              type="button"
              onPointerDown={e => e.preventDefault()}
              onMouseDown={e => e.preventDefault()}
              onClick={closeSearch}
              className="shrink-0 py-2 text-body font-semibold text-v-d"
            >
              Cancelar
            </button>
          )}
        </div>
        <div className="hide-when-keyboard mt-2 flex gap-1.5 overflow-x-auto">
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
        {partialHint && (
          <p className="mt-2 text-label font-medium text-ink-3">{partialHint}</p>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-6 pb-fab pt-1">
        {shown.length === 0 && !loadingMore && (
          <EmptyState
            icon={Search}
            title={total === 0
              ? 'Todavía no hay clientas.'
              : q
                ? 'Ninguna clienta coincide con esa búsqueda.'
                : 'Ninguna clienta en este filtro.'}
            hint={total === 0 ? 'El alta está arriba, a la derecha.' : undefined}
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
              <DarCitaLink
                href={`/agenda?new=1&client=${c.id}`}
                ariaLabel={`Dar cita a ${c.full_name}`}
              />
            </div>
          );
        })}
        <div ref={sentinelRef} className="flex min-h-[48px] items-center justify-center py-3">
          {loadingMore && <Loader2 size={22} className="animate-spin text-ink-3" aria-label="Cargando más" />}
          {!loadingMore && hasMore && debouncedQ.length < 2 && (
            <span className="text-label text-ink-3">Desplázate para cargar más</span>
          )}
        </div>
      </div>
      {alta === '1' && <NewClientSheet />}
    </div>
  );
}
