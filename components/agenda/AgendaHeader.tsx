'use client';

import { useRouter } from 'next/navigation';
import { Ban, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import Chip from '@/components/ui/Chip';
import { shallowSet } from '@/hooks/useShallowQuery';
import { dayTitle, weekMondayOffset, weekTitle } from '@/lib/time';
import type { Provider } from '@/lib/types';

export default function AgendaHeader({
  day, mode, label, waiting, providers = [], selectedPro, canFilter,
}: {
  day: number;
  mode: 'dia' | 'semana';
  label: string;
  waiting: number;
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
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        if (v) q.set(k, v);
        else q.delete(k);
      }
    }
    router.push(`/agenda?${q.toString()}`);
  };

  const seg = (active: boolean) =>
    `min-h-[36px] rounded-chip px-5 text-body font-semibold transition ${
      active ? 'bg-surface-card text-v-d shadow-seg' : 'text-ink-2'
    }`;

  return (
    <header className="shrink-0 px-5 pb-3 pt-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-caption font-bold uppercase tracking-[.04em] text-v">{label}</div>
          <h1 className="mt-0.5 text-h1 font-extrabold leading-[1.15] tracking-[-.025em]">
            {mode === 'semana' ? weekTitle(day) : dayTitle(day)}
          </h1>
        </div>
        <div className="flex gap-2">
          {((mode === 'dia' && day !== 0) || (mode === 'semana' && weekMondayOffset(day) !== weekMondayOffset(0))) && (
            <button
              type="button"
              onClick={() => go(0, mode)}
              className="min-h-[44px] rounded-icon border border-surface-line bg-surface-card px-3 text-label font-bold text-v-d shadow-card transition active:scale-[.96]"
            >
              Hoy
            </button>
          )}
          <button
            onClick={() => go(mode === 'semana' ? weekMondayOffset(day) - 7 : day - 1, mode)}
            aria-label="Anterior"
            className="grid h-11 w-11 place-items-center rounded-icon border border-surface-line bg-surface-card text-ink-2 shadow-card transition hover:bg-v-tint active:scale-[.96]"
          >
            <ChevronLeft size={18} strokeWidth={2.2} />
          </button>
          <button
            onClick={() => go(mode === 'semana' ? weekMondayOffset(day) + 7 : day + 1, mode)}
            aria-label="Siguiente"
            className="grid h-11 w-11 place-items-center rounded-icon border border-surface-line bg-surface-card text-ink-2 shadow-card transition hover:bg-v-tint active:scale-[.96]"
          >
            <ChevronRight size={18} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {canFilter && providers.length > 1 && (
        <div className="mt-3 flex gap-1.5 overflow-x-auto">
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

      <div className="mt-3.5 flex items-center gap-2.5">
        <div role="group" aria-label="Vista de agenda" className="flex gap-1 rounded-icon bg-track p-1">
          <button aria-pressed={mode === 'dia'} className={seg(mode === 'dia')} onClick={() => go(day, 'dia')}>Día</button>
          <button aria-pressed={mode === 'semana'} className={seg(mode === 'semana')} onClick={() => go(day, 'semana')}>Semana</button>
        </div>
        <button
          onClick={() => shallowSet({
            block: '1', wait: null, new: null, appt: null, close: null, bloqueo: null,
          })}
          aria-label="Bloquear hueco"
          className="ml-auto grid h-11 w-11 place-items-center rounded-icon border border-surface-line bg-surface-card shadow-card transition active:scale-[.96]"
        >
          <Ban size={16} className="text-ink-2" strokeWidth={2.2} />
        </button>
        <button
          onClick={() => shallowSet({
            wait: '1', new: null, block: null, bloqueo: null, appt: null, close: null,
          })}
          className="flex min-h-[44px] items-center gap-[7px] rounded-icon border border-surface-line bg-surface-card px-3 text-label font-bold shadow-card transition active:scale-[.96]"
        >
          <Clock size={15} className="text-v" strokeWidth={2.2} />
          Espera
          <span className="rounded-lg bg-v-soft px-1.5 text-caption text-v-d">{waiting}</span>
        </button>
      </div>
    </header>
  );
}
