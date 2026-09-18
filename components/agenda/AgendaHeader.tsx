'use client';

import { useRouter } from 'next/navigation';
import { Ban, Clock } from 'lucide-react';
import Segmented from '@/components/ui/Segmented';
import BrandLogo from '@/components/BrandLogo';
import WeekStrip from '@/components/agenda/WeekStrip';
import Chip from '@/components/ui/Chip';
import { shallowSet } from '@/hooks/useShallowQuery';
import { dayTitle, weekRangeTitle, weekSubtitle } from '@/lib/time';
import type { Provider } from '@/lib/types';

export default function AgendaHeader({
  day, mode, waiting, waitHint, citas, occ, providers = [], selectedPro, canFilter,
}: {
  day: number;
  mode: 'dia' | 'semana';
  waiting: number;
  waitHint?: string | null;
  citas?: number;
  occ?: number;
  providers?: Provider[];
  selectedPro?: string | null;
  canFilter?: boolean;
}) {
  const router = useRouter();
  const go = (d: number, m: string, extra?: Record<string, string>) => {
    const q = new URLSearchParams();
    q.set('day', String(d));
    q.set('mode', m);
    if (selectedPro) q.set('pro', selectedPro);
    if (typeof window !== 'undefined' && window.location.search.includes('new=1')) {
      const live = new URLSearchParams(window.location.search);
      q.set('new', '1');
      for (const k of ['client', 'nombre', 'hora', 'servicio', 'con']) {
        const v = live.get(k);
        if (v) q.set(k, v);
      }
    }
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        if (v) q.set(k, v);
        else q.delete(k);
      }
    }
    router.push(`/agenda?${q.toString()}`);
  };

  const title = mode === 'semana' ? weekRangeTitle(day) : dayTitle(day);
  const subtitle = mode === 'semana'
    ? weekSubtitle(day)
    : (citas != null && occ != null
      ? `${citas} ${citas === 1 ? 'cita' : 'citas'} · ${occ} % ocupación`
      : null);

  return (
    <header className="shrink-0 px-3 pb-2.5 pt-2">
      <div className="mb-2.5 flex items-center gap-2">
        <BrandLogo size={40} alt="" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-title font-extrabold leading-tight tracking-[-.02em]">{title}</h1>
          {subtitle && (
            <p className="truncate text-caption font-semibold text-ink-2">{subtitle}</p>
          )}
        </div>
        {day !== 0 && (
          <button
            type="button"
            onClick={() => go(0, mode === 'semana' ? 'semana' : 'dia')}
            className="shrink-0 rounded-pill bg-v-tint px-3 py-2 text-label font-extrabold text-v-d"
          >
            Hoy
          </button>
        )}
        <Segmented
          ariaLabel="Vista de agenda"
          value={mode}
          options={[
            { id: 'dia', label: 'Día' },
            { id: 'semana', label: 'Semana' },
          ]}
          onChange={m => go(day, m)}
        />
      </div>

      <WeekStrip
        selectedOffset={day}
        onSelect={offset => go(offset, 'dia')}
        onShiftWeek={delta => go(day + delta, mode)}
      />

      {mode === 'semana' && canFilter && providers.length > 1 && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto">
          <Chip className="shrink-0" active={!selectedPro} onClick={() => go(day, mode, { pro: '' })}>
            Todas
          </Chip>
          {providers.map(p => (
            <Chip
              key={p.id}
              className="shrink-0"
              active={selectedPro === p.id}
              onClick={() => go(day, mode, { pro: p.id })}
            >
              {p.full_name.split(' ')[0]}
            </Chip>
          ))}
        </div>
      )}

      {waiting > 0 ? (
        <div className="mt-2.5 flex items-center gap-2 rounded-field bg-v-soft/80 px-3 py-2.5">
          <Clock size={18} className="shrink-0 text-v-d" strokeWidth={2.2} />
          <button
            type="button"
            onClick={() => shallowSet({
              wait: '1', new: null, block: null, bloqueo: null, appt: null, close: null,
            })}
            className="min-w-0 flex-1 truncate text-left text-label font-bold text-v-d"
          >
            {waiting} en espera{waitHint ? ` · ${waitHint}` : ''}
          </button>
          <button
            type="button"
            onClick={() => shallowSet({
              wait: '1', new: null, block: null, bloqueo: null, appt: null, close: null,
            })}
            className="shrink-0 text-label font-extrabold text-v-d"
          >
            Encajar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => shallowSet({
            block: '1', wait: null, new: null, appt: null, close: null, bloqueo: null,
          })}
          className="mt-2 flex items-center gap-1.5 text-caption font-bold text-ink-3"
        >
          <Ban size={14} strokeWidth={2.2} />
          Bloquear un hueco
        </button>
      )}
    </header>
  );
}
