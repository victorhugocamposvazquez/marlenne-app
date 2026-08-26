'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarPlus, MessageCircle, Phone, Plus, Search } from 'lucide-react';
import NewClientSheet from '@/components/clienta/NewClientSheet';
import { shallowSet, useShallowParam } from '@/hooks/useShallowQuery';
import { avatarColor, initials } from '@/lib/categories';
import { phoneDigits, waHref, waRecallMsg } from '@/lib/phone';
import { isRecallDue, shortWhen } from '@/lib/time';
import { fold } from '@/lib/voice';
import type { ClientListRow } from '@/lib/types';

type Filter = 'todas' | 'vip' | 'proxima' | 'sin' | 'tratamiento' | 'volver';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'proxima', label: 'Con cita' },
  { id: 'sin', label: 'Sin próxima' },
  { id: 'volver', label: 'Por volver' },
  { id: 'tratamiento', label: 'En curso' },
  { id: 'vip', label: 'VIP' },
];

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
      if (filter === 'volver' && !isRecallDue(c.last_at, c.next_at)) return false;
      if (!needle && tel.length < 3) return true;
      const nameHit = needle && fold(c.full_name).includes(needle);
      const phoneHit = tel.length >= 3 && phoneDigits(c.phone ?? '').includes(tel);
      return !!(nameHit || phoneHit);
    });
  }, [clients, q, filter]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 px-5 pb-3 pt-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[23px] font-extrabold tracking-[-.025em]">Clientas</h1>
            <p className="mt-px text-[13px] font-medium text-ink-2">
              {shown.length === clients.length
                ? `${clients.length} en la base`
                : `${shown.length} de ${clients.length}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => shallowSet({ alta: '1' })}
            aria-label="Nueva clienta"
            className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[14px] bg-grad text-white shadow-btn"
          >
            <Plus size={20} strokeWidth={2.4} />
          </button>
        </div>
        <div className="mt-3.5 flex items-center gap-2.5 rounded-field border border-surface-line bg-white px-3.5 shadow-card">
          <Search size={17} className="text-ink-3" strokeWidth={2.2} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar nombre o teléfono"
            aria-label="Buscar clientas"
            className="flex-1 border-0 bg-transparent py-3 text-sm font-medium outline-none"
          />
          {q && (
            <button type="button" onClick={() => setQ('')} className="text-[12px] font-bold text-ink-3">
              Limpiar
            </button>
          )}
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto">
          {FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-chip px-3 py-1.5 text-[12px] font-bold ${
                filter === f.id ? 'bg-grad text-white shadow-pill' : 'border border-surface-line bg-white text-ink-2'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-auto px-5 pb-fab pt-0.5">
        {shown.length === 0 && (
          <p className="rounded-row border border-dashed border-handle bg-white/60 px-4 py-8 text-center text-[13px] font-semibold text-ink-3">
            {clients.length === 0
              ? 'Todavía no hay clientas. El alta está arriba, a la derecha.'
              : q
                ? 'Ninguna clienta coincide con esa búsqueda.'
                : 'Ninguna clienta en este filtro.'}
          </p>
        )}
        {shown.map(c => {
          const wa = waHref(
            c.phone,
            filter === 'volver' && c.last_at
              ? waRecallMsg({ name: c.full_name, lastAt: c.last_at })
              : undefined,
          );
          return (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded-row border border-surface-line bg-white p-3.5 shadow-card"
            >
              <Link href={`/clientas/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[14px] text-[13px] font-bold text-white"
                  style={{ background: avatarColor(c.full_name) }}
                >
                  {initials(c.full_name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[14.5px] font-bold tracking-[-.01em]">{c.full_name}</span>
                    {c.tags?.includes('VIP') && (
                      <span className="shrink-0 rounded-[7px] bg-v-soft px-[7px] py-0.5 text-[9.5px] font-extrabold text-v-d">VIP</span>
                    )}
                  </span>
                  <span className="block truncate text-[11.5px] font-medium text-ink-3">
                    {c.next_at
                      ? `Próxima ${shortWhen(c.next_at)}`
                      : c.last_at
                        ? `Última ${shortWhen(c.last_at)}`
                        : c.open_treatments?.length
                          ? c.open_treatments.join(' · ')
                          : (c.phone || 'Sin citas todavía')}
                  </span>
                </span>
              </Link>
              <Link
                href={`/agenda?new=1&client=${c.id}`}
                aria-label={`Nueva cita para ${c.full_name}`}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border border-surface-line bg-white text-v-d"
              >
                <CalendarPlus size={16} strokeWidth={2.2} />
              </Link>
              {c.phone && (
                <a
                  href={`tel:${c.phone}`}
                  aria-label={`Llamar a ${c.full_name}`}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-v-tint text-v-d"
                >
                  <Phone size={16} strokeWidth={2.2} />
                </a>
              )}
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`WhatsApp a ${c.full_name}`}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-emerald-50 text-emerald-700"
                >
                  <MessageCircle size={16} strokeWidth={2.2} />
                </a>
              )}
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
