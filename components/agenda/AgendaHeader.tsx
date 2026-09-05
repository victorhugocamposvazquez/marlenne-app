'use client';

import { useRouter } from 'next/navigation';
import { Ban, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import Chip from '@/components/ui/Chip';
import IconButton from '@/components/ui/IconButton';
import PageHeading from '@/components/ui/PageHeading';
import Segmented from '@/components/ui/Segmented';
import { shallowSet } from '@/hooks/useShallowQuery';
import { dayTitle, weekMondayOffset, weekRangeTitle, weekSubtitle } from '@/lib/time';
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

  return (
    <header className="shrink-0 px-5 pb-3 pt-5">
      <PageHeading
        kicker={<div className="text-caption font-bold uppercase tracking-[.04em] text-v">{label}</div>}
        title={mode === 'semana' ? weekRangeTitle(day) : dayTitle(day)}
        subtitle={mode === 'semana' ? weekSubtitle(day) : undefined}
      >
        <div className="flex gap-2">
          {((mode === 'dia' && day !== 0) || (mode === 'semana' && weekMondayOffset(day) !== weekMondayOffset(0))) && (
            <button
              type="button"
              onClick={() => go(0, mode)}
              className="min-h-[44px] rounded-icon border border-surface-line bg-surface-card px-3 text-label font-bold text-v-d shadow-card transition motion-safe:active:scale-[.96]"
            >
              Hoy
            </button>
          )}
          <IconButton
            label="Anterior"
            onClick={() => go(mode === 'semana' ? weekMondayOffset(day) - 7 : day - 1, mode)}
          >
            <ChevronLeft size={18} strokeWidth={2.2} />
          </IconButton>
          <IconButton
            label="Siguiente"
            onClick={() => go(mode === 'semana' ? weekMondayOffset(day) + 7 : day + 1, mode)}
          >
            <ChevronRight size={18} strokeWidth={2.2} />
          </IconButton>
        </div>
      </PageHeading>

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
        <Segmented
          ariaLabel="Vista de agenda"
          value={mode}
          options={[
            { id: 'dia', label: 'Día' },
            { id: 'semana', label: 'Semana' },
          ]}
          onChange={m => go(day, m)}
        />
        <IconButton
          className="ml-auto"
          label="Bloquear hueco"
          onClick={() => shallowSet({
            block: '1', wait: null, new: null, appt: null, close: null, bloqueo: null,
          })}
        >
          <Ban size={16} className="text-ink-2" strokeWidth={2.2} />
        </IconButton>
        <button
          onClick={() => shallowSet({
            wait: '1', new: null, block: null, bloqueo: null, appt: null, close: null,
          })}
          className="flex min-h-[44px] items-center gap-[7px] rounded-icon border border-surface-line bg-surface-card px-3 text-label font-bold shadow-card transition motion-safe:active:scale-[.96]"
        >
          <Clock size={15} className="text-v" strokeWidth={2.2} />
          Espera
          <span className="rounded-badge bg-v-soft px-1.5 text-caption text-v-d">{waiting}</span>
        </button>
      </div>
    </header>
  );
}
