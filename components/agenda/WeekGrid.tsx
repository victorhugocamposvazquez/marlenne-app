'use client';

import { useRouter } from 'next/navigation';
import { BarChart3, ChevronRight } from 'lucide-react';
import LiveRefresh from '@/components/LiveRefresh';
import { DAY_END, DAY_START, nowMinutes } from '@/lib/time';
import {
  eurosLbl,
  gapBand,
  isClosedDay,
  nowMarkerPct,
  dayLine,
  timelineBlocks,
  weekInsight,
  weekTotals,
} from '@/lib/week-view';
import type { WeekDay } from '@/lib/types';

const SHORT = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'] as const;

const TONE: Record<string, string> = {
  ok: 'text-ok-fg',
  warn: 'text-warn-fg',
  muted: 'text-ink-3',
  now: 'text-v-d',
  plain: 'text-ink-2',
};

export default function WeekGrid({
  days, selectedPro, providerCount,
}: {
  days: WeekDay[];
  selectedPro?: string | null;
  providerCount: number;
}) {
  const router = useRouter();
  const nowMin = nowMinutes();
  const totals = weekTotals(days, providerCount);
  const insight = weekInsight(days, 0);

  const href = (offset: number) => {
    const q = new URLSearchParams({ day: String(offset), mode: 'dia' });
    if (selectedPro) q.set('pro', selectedPro);
    return `/agenda?${q.toString()}`;
  };

  return (
    <div className="h-0 min-h-0 flex-1 overflow-auto px-4 pb-16">
      <LiveRefresh tables={['appointments']} />

      <section className="mb-2.5 rounded-card border border-surface-line bg-surface-card px-4 py-3.5 shadow-card">
        <div className="grid grid-cols-3 gap-2">
          <Kpi label="Citas" value={String(totals.citas)} />
          <Kpi label="Ocupación" value={`${totals.occ} %`} />
          <Kpi label="Caja" value={eurosLbl(totals.euros)} />
        </div>
      </section>

      {insight && (
        <button
          type="button"
          onClick={() => router.push(href(insight.dayOffset))}
          className="mb-3 flex w-full items-center gap-2.5 rounded-row border border-v/20 bg-v-tint px-3.5 py-3 text-left shadow-card motion-safe:active:scale-[.99]"
        >
          <BarChart3 size={16} strokeWidth={2.2} className="shrink-0 text-v" aria-hidden />
          <span className="min-w-0 flex-1 text-caption font-semibold leading-snug text-ink">{insight.text}</span>
          <span className="shrink-0 text-label font-extrabold text-v-d">Llenar</span>
        </button>
      )}

      <div className="mb-1.5 grid grid-cols-[38px_minmax(0,1fr)_16px] items-center gap-2 px-2.5 text-micro font-bold tabular-nums text-ink-3">
        <span />
        <span className="flex">
          <span>9:00</span>
          <span className="mx-auto">14:00</span>
          <span>20:00</span>
        </span>
        <span />
      </div>

      <div className="flex flex-col gap-2">
        {days.map((d, i) => {
          const closed = isClosedDay(d);
          const line = dayLine(d, providerCount, d.isToday ? nowMin : undefined);
          const blocks = timelineBlocks(d.appointments);
          const band = !closed && line.tone === 'warn' ? gapBand(d.appointments) : null;
          const short = SHORT[i] ?? d.dow;
          return (
            <button
              key={d.offset}
              type="button"
              onClick={() => router.push(href(d.offset))}
              aria-label={`${d.isToday ? 'Hoy' : d.name} ${d.num}. ${line.text}`}
              className={`grid grid-cols-[38px_minmax(0,1fr)_16px] items-center gap-2 rounded-row border px-2.5 py-2.5 text-left shadow-card motion-safe:active:scale-[.99] ${
                d.isToday ? 'border-v/45 bg-v-tint' : 'border-surface-line bg-surface-card'
              }`}
            >
              <span className="w-[38px]">
                <span className="block text-micro font-extrabold tracking-[.04em] text-ink-3">
                  {d.isToday ? 'HOY' : short}
                </span>
                <span className="block text-body-lg font-extrabold tabular-nums leading-none">{d.num}</span>
              </span>
              <span className="min-w-0">
                <span className="relative block h-3.5 overflow-hidden rounded-full bg-track">
                  {closed ? (
                    <span className="absolute inset-0 rounded-full border border-dashed border-handle bg-transparent" />
                  ) : (
                    <>
                      {band && (
                        <span
                          className="absolute top-0 h-full rounded-full border border-dashed border-warn-fg/50 bg-warn-bg/80"
                          style={{ left: `${band.left}%`, width: `${band.width}%` }}
                        />
                      )}
                      {blocks.map(b => (
                        <span
                          key={b.id}
                          className="absolute top-0 h-full rounded-full"
                          style={{ left: `${b.left}%`, width: `${b.width}%`, background: b.color }}
                        />
                      ))}
                      {d.isToday && nowMin > DAY_START && nowMin < DAY_END && (
                        <span
                          className="absolute top-[-2px] z-[1] h-[18px] w-0.5 rounded-full bg-ink"
                          style={{ left: `${nowMarkerPct(nowMin)}%` }}
                        />
                      )}
                    </>
                  )}
                </span>
                <span className={`mt-1 block truncate text-micro font-bold ${TONE[line.tone]}`}>
                  {line.text}
                </span>
              </span>
              <ChevronRight size={16} strokeWidth={2.2} className="justify-self-end text-ink-3" aria-hidden />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-micro font-bold uppercase tracking-[.04em] text-ink-3">{label}</div>
      <div className="mt-0.5 text-title font-extrabold tabular-nums tracking-[-.03em]">{value}</div>
    </div>
  );
}
