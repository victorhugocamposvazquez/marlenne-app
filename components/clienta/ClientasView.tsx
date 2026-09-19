'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import NewClientSheet from '@/components/clienta/NewClientSheet';
import Chip from '@/components/ui/Chip';
import ChipScroller from '@/components/ui/ChipScroller';
import EmptyState from '@/components/ui/EmptyState';
import IconButton from '@/components/ui/IconButton';
import Badge from '@/components/ui/Badge';
import PageHeading from '@/components/ui/PageHeading';
import { shallowSet, useShallowParam } from '@/hooks/useShallowQuery';
import { avatarColor, initials } from '@/lib/categories';
import { phoneDigits } from '@/lib/phone';
import { isRecallDue, shortWhen } from '@/lib/time';
import { fold } from '@/lib/voice';
import type { ClientListRow } from '@/lib/types';

type Filter = 'todas' | 'vip' | 'proxima' | 'sin' | 'tratamiento' | 'volver' | 'bono';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'proxima', label: 'Con cita' },
  { id: 'sin', label: 'Sin próxima' },
  { id: 'volver', label: 'Por volver' },
  { id: 'tratamiento', label: 'En curso' },
  { id: 'bono', label: 'Con bono' },
  { id: 'vip', label: 'VIP' },
];

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

  const shown = useMemo(() => {
    const needle = fold(q);
    const tel = phoneDigits(q);
    return clients.filter(c => {
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
  }, [clients, q, filter]);

  return (
    <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 px-6 pb-2 pt-5">
        <PageHeading
          title="Clientas"
          subtitle={
            shown.length === clients.length
              ? `${clients.length} fichas`
              : `${shown.length} de ${clients.length}`
          }
        >
          <IconButton
            label="Nueva clienta"
            tone="ink"
            onClick={() => shallowSet({ alta: '1' })}
          >
            <Plus size={20} strokeWidth={2.4} />
          </IconButton>
        </PageHeading>
        <div className="mt-4 flex h-[54px] items-center gap-2.5 rounded-field bg-surface-soft px-4">
          <Search size={18} className="text-ink-3" strokeWidth={2.2} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar por nombre o teléfono"
            aria-label="Buscar clientas"
            className="flex-1 border-0 bg-transparent text-[16px] outline-none placeholder:text-ink-3"
          />
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto">
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
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Link
                  href={`/clientas/${c.id}`}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[14px] font-bold text-white"
                  style={{ background: avatarColor(c.full_name) }}
                  aria-label={c.full_name}
                >
                  {initials(c.full_name)}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/clientas/${c.id}`} className="flex min-w-0 items-center gap-1.5">
                    <span className="line-clamp-2 text-body-lg font-semibold leading-snug">{c.full_name}</span>
                    {c.tags?.includes('VIP') && (
                      <Badge tone="brand" className="shrink-0">VIP</Badge>
                    )}
                  </Link>
                  <ChipScroller className="mt-0.5" label={`${c.full_name}: teléfono y contexto`}>
                    <span className="whitespace-nowrap text-label">
                      <span className={hasPhone ? 'font-semibold text-ink' : 'font-medium text-ink-2'}>
                        {phone}
                      </span>
                      <span className="text-ink-3"> · {ctx}</span>
                    </span>
                  </ChipScroller>
                </div>
              </div>
              <Link
                href={`/agenda?new=1&client=${c.id}`}
                aria-label={`Dar cita a ${c.full_name}`}
                className="inline-flex h-[38px] shrink-0 items-center rounded-pill bg-ink px-3.5 text-label font-semibold text-white"
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
