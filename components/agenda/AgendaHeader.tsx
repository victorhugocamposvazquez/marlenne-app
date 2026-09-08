'use client';

import { useRouter } from 'next/navigation';
import { Ban, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import Chip from '@/components/ui/Chip';
import Segmented from '@/components/ui/Segmented';
import BrandLogo from '@/components/BrandLogo';
import { shallowSet } from '@/hooks/useShallowQuery';
import { compactDayTitle, weekMondayOffset, weekRangeTitle, weekSubtitle } from '@/lib/time';
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

  const title = mode === 'semana' ? weekRangeTitle(day) : compactDayTitle(day);
  const subtitle = mode === 'semana'
    ? weekSubtitle(day)
    : (citas != null && occ != null
      ? `${citas} ${citas === 1 ? 'cita' : 'citas'} · ${occ} % ocupación`
      : null);

  return (
    <header className="shrink-0 px-4 pb-2 pt-2">
      <div className="flex items-center gap-2">
        <BrandLogo size={36} alt="" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-body-lg font-extrabold leading-tight tracking-[-.02em]">{title}</h1>
          {subtitle && (
            <p className="truncate text-caption font-semibold text-ink-2">{subtitle}</p>
          )}
        </div>
        {((mode === 'dia' && day !== 0) || (mode === 'semana' && weekMondayOffset(day) !== weekMondayOffset(0))) && (
          <button
            type="button"
            onClick={() => go(0, mode)}
            className="shrink-0 rounded-icon px-2 text-caption font-bold text-v-d"
          >
            Hoy
          </button>
        )}
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => go(mode === 'semana' ? weekMondayOffset(day) - 7 : day - 1, mode)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-icon text-ink-2"
        >
          <ChevronLeft size={18} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          aria-label="Siguiente"
          onClick={() => go(mode === 'semana' ? weekMondayOffset(day) + 7 : day + 1, mode)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-icon text-ink-2"
        >
          <ChevronRight size={18} strokeWidth={2.2} />
        </button>
        <Segmented
          size="sm"
          ariaLabel="Vista de agenda"
          value={mode}
          options={[
            { id: 'dia', label: 'Día' },
            { id: 'semana', label: 'Sem' },
          ]}
          onChange={m => go(day, m)}
        />
        {waiting === 0 && (
          <button
            type="button"
            aria-label="Bloquear hueco"
            onClick={() => shallowSet({
              block: '1', wait: null, new: null, appt: null, close: null, bloqueo: null,
            })}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-icon text-ink-2"
          >
            <Ban size={15} strokeWidth={2.2} />
          </button>
        )}
      </div>

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
        <div className="mt-2 flex items-center gap-2 rounded-field bg-v-soft/80 px-3 py-2">
          <Clock size={15} className="shrink-0 text-v-d" strokeWidth={2.2} />
          <button
            type="button"
            onClick={() => shallowSet({
              wait: '1', new: null, block: null, bloqueo: null, appt: null, close: null,
            })}
            className="min-w-0 flex-1 truncate text-left text-caption font-bold text-v-d"
          >
            {waiting} en espera{waitHint ? ` · ${waitHint}` : ''}
          </button>
          <button
            type="button"
            onClick={() => shallowSet({
              wait: '1', new: null, block: null, bloqueo: null, appt: null, close: null,
            })}
            className="shrink-0 text-caption font-extrabold text-v-d"
          >
            Encajar
          </button>
          <button
            type="button"
            aria-label="Bloquear hueco"
            onClick={() => shallowSet({
              block: '1', wait: null, new: null, appt: null, close: null, bloqueo: null,
            })}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-icon text-ink-2"
          >
            <Ban size={15} strokeWidth={2.2} />
          </button>
        </div>
      ) : null}
    </header>
  );
}
