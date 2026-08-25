'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CATEGORIES, STATUS, avatarColor } from '@/lib/categories';
import { fmt, minutesOfDay, nowMinutes, dayKey, DAY_START, DAY_END } from '@/lib/time';
import { moveAppointment } from '@/app/actions/appointments';
import type { AgendaAppt, AgendaBlock, Provider } from '@/lib/types';
import { useDragAppointment, COL_W } from '@/hooks/useDragAppointment';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { useToast } from '@/components/Toast';

export default function DayGrid({
  date, providers, appointments, blocks, canMoveProvider,
}: {
  date: string;
  providers: Provider[];
  appointments: AgendaAppt[];
  blocks: AgendaBlock[];
  canMoveProvider: boolean;
}) {
  const HOUR_H = 70;
  const pxPerMin = HOUR_H / 60;
  const gridH = (DAY_END - DAY_START) * pxPerMin;
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Record<string, { start: number; provider: string }>>({});
  const [now, setNow] = useState(nowMinutes);
  const router = useRouter();
  const toast = useToast();
  useRealtimeRefresh(['appointments', 'time_blocks']);
  useEffect(() => {
    const t = setInterval(() => setNow(nowMinutes()), 60_000);
    return () => clearInterval(t);
  }, []);
  const pathname = usePathname();
  const params = useSearchParams();

  const openAppt = useCallback((id: string) => {
    const next = new URLSearchParams(params.toString());
    next.set('appt', id);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }, [params, pathname, router]);

  const { drag, onPointerDown } = useDragAppointment({
    pxPerMin,
    snap: 15,
    providerIds: canMoveProvider ? providers.map(p => p.id) : [providers[0]?.id],
    onDrop: (id, start, providerId) => {
      setOptimistic(o => ({ ...o, [id]: { start, provider: providerId } }));
      startTransition(async () => {
        const r = await moveAppointment({ id, date, startMin: start, providerId });
        if (r.ok) return;
        setOptimistic(o => {
          const next = { ...o };
          delete next[id];
          return next;
        });
        toast(r.error?.includes('overlap') || r.error?.includes('exclusion')
          ? 'Ese hueco ya está ocupado'
          : (r.error ?? 'No se ha podido mover la cita'), 'err');
      });
    },
    onTap: openAppt,
  });

  const hours = [];
  for (let m = DAY_START; m <= DAY_END; m += 60) hours.push({ label: fmt(m), top: (m - DAY_START) * pxPerMin });

  const place = (a: AgendaAppt) => {
    const o = optimistic[a.id];
    const live = drag?.id === a.id ? drag : null;
    return {
      start: live?.start ?? o?.start ?? minutesOfDay(a.starts_at),
      provider: live?.providerId ?? o?.provider ?? a.provider_id,
      dragging: !!live,
    };
  };

  return (
    <>
      <div className="min-h-0 flex-1 overflow-auto pb-2">
        <div className="min-w-max pr-3.5">
          {/* Cabeceras de profesional */}
          <div className="sticky top-0 z-[6] flex bg-[linear-gradient(180deg,#EEECFA_74%,rgba(238,236,250,0))] pb-2.5 pt-0.5">
            <div className="sticky left-0 z-[7] w-[46px] shrink-0 bg-surface-bg" />
            {providers.map(p => {
              const count = appointments.filter(a => place(a).provider === p.id).length;
              return (
                <div key={p.id} className="shrink-0 pr-2" style={{ width: COL_W }}>
                  <div
                    className="flex items-center gap-2 rounded-[15px] bg-white p-[7px_9px] shadow-card"
                    style={{ borderBottom: `3px solid ${p.color ?? avatarColor(p.full_name)}` }}
                  >
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-[10px] text-[10.5px] font-bold text-white"
                      style={{ background: p.color ?? avatarColor(p.full_name) }}
                    >
                      {p.initials}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-bold leading-tight tracking-[-.01em]">{p.full_name}</span>
                      <span className="block text-[10.5px] font-medium text-ink-3">
                        {count === 1 ? '1 cita' : `${count} citas`}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex">
            {/* Gutter de horas */}
            <div className="sticky left-0 z-[5] w-[46px] shrink-0 bg-surface-bg" style={{ height: gridH }}>
              {hours.map(h => (
                <div key={h.label} className="absolute right-2 -translate-y-1.5 text-[10.5px] font-semibold tabular-nums text-ink-3" style={{ top: h.top }}>
                  {h.label}
                </div>
              ))}
            </div>

            <div className="relative" style={{ height: gridH }}>
              {hours.map(h => (
                <div key={h.label} className="absolute left-0 h-px bg-grid-h" style={{ top: h.top, width: providers.length * COL_W }} />
              ))}
              {providers.slice(1).map((_, i) => (
                <div key={i} className="absolute top-0 w-px bg-grid-v" style={{ left: (i + 1) * COL_W - 4, height: gridH }} />
              ))}

              {dayKey(date) === dayKey(new Date()) && now >= DAY_START && now <= DAY_END && (
                <div
                  className="pointer-events-none absolute z-[8] flex items-center"
                  style={{ top: (now - DAY_START) * pxPerMin, width: providers.length * COL_W }}
                >
                  <span className="-ml-1 h-2 w-2 shrink-0 rounded-full bg-[#EC4899] shadow-[0_0_0_3px_rgba(236,72,153,.25)]" />
                  <span className="h-px flex-1 bg-[#EC4899]" />
                </div>
              )}

              <div className="relative flex">
                {providers.map(p => (
                  <div key={p.id} className="relative shrink-0" style={{ width: COL_W, height: gridH }}>
                    {blocks.filter(b => b.provider_id === p.id).map(b => {
                      const start = minutesOfDay(b.starts_at);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            const next = new URLSearchParams(params.toString());
                            next.set('bloqueo', b.id);
                            router.push(`${pathname}?${next.toString()}`, { scroll: false });
                          }}
                          className="absolute left-0.5 right-[9px] flex items-center justify-center rounded-[13px] border border-dashed border-[#CFC8E6] bg-block text-[11px] font-bold text-ink-3"
                          style={{ top: (start - DAY_START) * pxPerMin + 2, height: b.duration_min * pxPerMin - 6 }}
                        >
                          {b.label ?? b.reason}
                        </button>
                      );
                    })}

                    {appointments.map(a => {
                      const pos = place(a);
                      if (pos.provider !== p.id) return null;
                      const st = STATUS[a.status];
                      const cat = CATEGORIES[a.category];
                      return (
                        <div
                          key={a.id}
                          data-id={a.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`${a.client_label}, ${a.service_name}, ${fmt(pos.start)}`}
                          onPointerDown={e => onPointerDown(e, a.id, pos.start, p.id, a.duration_min, a.status)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAppt(a.id); } }}
                          className="absolute left-0 right-2 overflow-hidden rounded-pill px-2.5 py-1.5 transition-shadow"
                          style={{
                            top: (pos.start - DAY_START) * pxPerMin + 2,
                            height: a.duration_min * pxPerMin - 6,
                            background: st.bg,
                            border: `1px solid ${st.border}`,
                            borderLeft: `4px solid ${st.edge}`,
                            boxShadow: pos.dragging ? '0 18px 44px rgba(60,40,120,.28)' : '0 4px 20px rgba(60,40,120,.07)',
                            transform: pos.dragging ? 'scale(1.04) rotate(-.6deg)' : 'none',
                            opacity: a.status === 'done' ? 0.62 : 1,
                            zIndex: pos.dragging ? 12 : 2,
                            cursor: 'grab',
                            touchAction: 'none',
                            userSelect: 'none',
                          }}
                        >
                          <div className="flex items-center gap-[5px]">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-sm" style={{ background: cat.color }} />
                            <span className="truncate text-[12.5px] font-bold leading-tight tracking-[-.01em]">{a.client_label}</span>
                          </div>
                          <div className="truncate text-[11px] font-medium text-ink-2">{a.service_name}</div>
                          {a.note && (
                            <div className="truncate text-[10.5px] font-medium text-ink-3">{a.note}</div>
                          )}
                          <div className="mt-0.5 text-[10.5px] font-semibold tabular-nums" style={{ color: st.edge }}>
                            {fmt(pos.start)} – {fmt(pos.start + a.duration_min)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 overflow-x-auto px-5 pb-2.5 pt-2 text-[11px] font-semibold text-ink-3">
        {Object.values(CATEGORIES).slice(0, 5).map(c => (
          <span key={c.label} className="flex shrink-0 items-center gap-[5px]">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: c.color }} />
            {c.label}
          </span>
        ))}
      </div>
    </>
  );
}
