'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CATEGORIES, STATUS, avatarColor } from '@/lib/categories';
import { citaCambiada, fmt, minutesOfDay, nowMinutes, dayKey, DAY_START, DAY_END } from '@/lib/time';
import { moveAppointment } from '@/lib/move-appointment';
import { createClient } from '@/lib/supabase/client';
import type { AgendaAppt, AgendaBlock, Provider } from '@/lib/types';
import { useDragAppointment, COL_W } from '@/hooks/useDragAppointment';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { shallowSet } from '@/hooks/useShallowQuery';
import { useToast } from '@/components/Toast';
import { GripVertical } from 'lucide-react';

export default function DayGrid({
  date, providers, appointments, blocks, canMoveProvider, selectedPro,
}: {
  date: string;
  providers: Provider[];
  appointments: AgendaAppt[];
  blocks: AgendaBlock[];
  canMoveProvider: boolean;
  selectedPro?: string | null;
}) {
  const HOUR_H = 70;
  const pxPerMin = HOUR_H / 60;
  const gridH = (DAY_END - DAY_START) * pxPerMin;
  const [optimistic, setOptimistic] = useState<Record<string, { start: number; provider: string }>>({});
  const [now, setNow] = useState(nowMinutes);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  useRealtimeRefresh(['appointments', 'time_blocks']);
  useEffect(() => {
    const t = setInterval(() => setNow(nowMinutes()), 60_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    setOptimistic(prev => {
      let changed = false;
      const next = { ...prev };
      for (const a of appointments) {
        const o = next[a.id];
        if (!o) continue;
        if (o.start === minutesOfDay(a.starts_at) && o.provider === a.provider_id) {
          delete next[a.id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [appointments]);
  useEffect(() => {
    if (!selectedPro || !scrollRef.current) return;
    const i = providers.findIndex(p => p.id === selectedPro);
    if (i <= 0) return;
    scrollRef.current.scrollLeft = i * COL_W;
  }, [selectedPro, providers]);

  const openAppt = useCallback((id: string) => {
    shallowSet({ appt: id });
  }, []);

  const { drag, onHandleDown, onCardDown, onCardClick } = useDragAppointment({
    pxPerMin,
    snap: 15,
    providerIds: canMoveProvider ? providers.map(p => p.id) : [providers[0]?.id],
    scrollRef,
    gridRef,
    onDrop: (id, start, providerId) => {
      const who = providers.find(p => p.id === providerId)?.full_name.split(' ')[0] ?? null;
      const from = appointments.find(a => a.id === id);
      const prevStart = optimistic[id]?.start ?? (from ? minutesOfDay(from.starts_at) : start);
      const prevProvider = optimistic[id]?.provider ?? from?.provider_id ?? providerId;
      const providerChanged = prevProvider !== providerId;
      setOptimistic(o => ({ ...o, [id]: { start, provider: providerId } }));
      void (async () => {
        const r = await moveAppointment(createClient(), { id, date, startMin: start, providerId });
        if (r.ok) {
          toast(citaCambiada(start, providerChanged ? who : null), {
            undo: () => {
              setOptimistic(o => ({ ...o, [id]: { start: prevStart, provider: prevProvider } }));
              void moveAppointment(createClient(), {
                id, date, startMin: prevStart, providerId: prevProvider,
              }).then(back => {
                if (back.ok) return;
                setOptimistic(o => ({ ...o, [id]: { start, provider: providerId } }));
                toast(back.error ?? 'No se ha podido deshacer', 'err');
              });
            },
          });
          return;
        }
        setOptimistic(o => {
          const next = { ...o };
          delete next[id];
          return next;
        });
        toast(r.error ?? 'No se ha podido mover la cita', 'err');
      })();
    },
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

  const dropCol = drag ? Math.max(0, providers.findIndex(p => p.id === drag.providerId)) : -1;

  const openEmpty = (providerId: string, clientY: number, el: HTMLElement) => {
    if (drag) return;
    const y = clientY - el.getBoundingClientRect().top;
    const snapped = Math.round((DAY_START + y / pxPerMin) / 15) * 15;
    const start = Math.max(DAY_START, Math.min(DAY_END - 15, snapped));
    const hora = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
    shallowSet({ new: '1', con: providerId, hora, appt: null, wait: null, block: null, bloqueo: null });
  };

  return (
    <div className="flex h-0 min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className={`min-h-0 flex-1 overflow-auto pb-16 select-none [-webkit-touch-callout:none] ${drag ? 'touch-none overscroll-none' : ''}`}
        onContextMenu={e => e.preventDefault()}
      >
        <div className="min-w-max pr-3.5">
          <div className="sticky top-0 z-[6] flex bg-[linear-gradient(180deg,rgb(var(--c-bg))_74%,rgb(var(--c-bg)/0))] pb-2.5 pt-0.5">
            <div className="sticky left-0 z-[7] w-[46px] shrink-0 bg-surface-bg" />
            {providers.map(p => {
              const count = appointments.filter(a => place(a).provider === p.id).length;
              return (
                <div key={p.id} className="shrink-0 pr-2" style={{ width: COL_W }}>
                  <div
                    className="flex items-center gap-2 rounded-pill bg-surface-card p-[7px_9px] shadow-card"
                    style={{ borderBottom: `3px solid ${p.color ?? avatarColor(p.full_name)}` }}
                  >
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-chip text-micro font-bold text-white"
                      style={{ background: p.color ?? avatarColor(p.full_name) }}
                    >
                      {p.initials}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-body font-bold leading-tight tracking-[-.01em]">{p.full_name}</span>
                      <span className="block text-micro font-medium text-ink-3">
                        {count === 1 ? '1 cita' : `${count} citas`}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex">
            <div className="sticky left-0 z-[5] w-[46px] shrink-0 bg-surface-bg" style={{ height: gridH }}>
              {hours.map(h => (
                <div key={h.label} className="absolute right-2 -translate-y-1.5 text-micro font-semibold tabular-nums text-ink-3" style={{ top: h.top }}>
                  {h.label}
                </div>
              ))}
            </div>

            <div ref={gridRef} className="relative" style={{ height: gridH, width: providers.length * COL_W }}>
              {hours.map(h => (
                <div key={h.label} className="absolute left-0 h-px bg-grid-h" style={{ top: h.top, width: providers.length * COL_W }} />
              ))}
              {providers.slice(1).map((_, i) => (
                <div key={i} className="absolute top-0 w-px bg-grid-v" style={{ left: (i + 1) * COL_W - 4, height: gridH }} />
              ))}
              {appointments.length === 0 && (
                <p className="absolute left-2 right-2 z-[2] text-center text-body font-semibold text-ink-2" style={{ top: 48 }}>
                  No hay citas este día
                </p>
              )}

              {dropCol >= 0 && (
                <div
                  className="pointer-events-none absolute top-0 z-[3] bg-v-soft/90"
                  style={{ left: dropCol * COL_W, width: COL_W, height: gridH }}
                />
              )}

              {drag && (
                <div
                  className="pointer-events-none absolute z-[9] flex items-center"
                  style={{ top: (drag.start - DAY_START) * pxPerMin, width: providers.length * COL_W }}
                >
                  <span className="-ml-1 rounded-badge bg-v px-1.5 py-0.5 text-caption font-extrabold tabular-nums text-white shadow-pill">
                    {fmt(drag.start)}
                  </span>
                  <span className="h-0.5 flex-1 bg-v" />
                </div>
              )}

              {dayKey(date) === dayKey(new Date()) && now >= DAY_START && now <= DAY_END && (
                <div
                  className="pointer-events-none absolute z-[8] flex items-center"
                  style={{ top: (now - DAY_START) * pxPerMin, width: providers.length * COL_W }}
                >
                  <span className="-ml-1 h-2 w-2 shrink-0 rounded-full bg-danger shadow-[0_0_0_3px_rgb(var(--c-danger)/.25)]" />
                  <span className="h-px flex-1 bg-danger" />
                </div>
              )}

              <div className="relative z-[1] flex">
                {providers.map(p => (
                  <div
                    key={p.id}
                    className="relative shrink-0"
                    style={{ width: COL_W, height: gridH }}
                    onClick={e => {
                      if (e.target !== e.currentTarget) return;
                      openEmpty(p.id, e.clientY, e.currentTarget);
                    }}
                  >
                    {blocks.filter(b => b.provider_id === p.id).map(b => {
                      const start = minutesOfDay(b.starts_at);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            shallowSet({ bloqueo: b.id });
                          }}
                          className="absolute left-0.5 right-[9px] flex items-center justify-center rounded-icon border border-dashed border-handle bg-block text-caption font-bold text-ink-3"
                          style={{ top: (start - DAY_START) * pxPerMin + 2, height: b.duration_min * pxPerMin - 6 }}
                        >
                          {b.label ?? b.reason}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {appointments.map(a => {
                const pos = place(a);
                const col = providers.findIndex(p => p.id === pos.provider);
                if (col < 0) return null;
                const st = STATUS[a.status];
                const cat = CATEGORIES[a.category];
                const canDrag = a.status !== 'done';
                return (
                  <div
                    key={a.id}
                    data-id={a.id}
                    data-no-pull
                    className={`absolute flex overflow-hidden rounded-pill select-none [-webkit-touch-callout:none] ${pos.dragging ? 'touch-none' : ''}`}
                    style={{
                      left: col * COL_W,
                      width: COL_W - 8,
                      top: (pos.start - DAY_START) * pxPerMin + 2,
                      height: a.duration_min * pxPerMin - 6,
                      background: st.bg,
                      border: `1px solid ${st.border}`,
                      borderLeft: `4px solid ${st.edge}`,
                      boxShadow: pos.dragging ? 'var(--sh-drag)' : 'var(--sh-card)',
                      transform: pos.dragging ? 'scale(1.03)' : 'none',
                      opacity: a.status === 'done' ? 0.62 : 1,
                      zIndex: pos.dragging ? 12 : 2,
                    }}
                    onPointerDown={canDrag ? e => onCardDown(e, a.id, pos.start, pos.provider, a.duration_min) : undefined}
                    onContextMenu={e => e.preventDefault()}
                  >
                    {canDrag && (
                      <button
                        type="button"
                        data-drag-handle
                        aria-label={`Mover cita de ${a.client_label}`}
                        className="relative flex w-7 shrink-0 touch-none select-none cursor-grab items-center justify-center text-ink-3 before:absolute before:-inset-y-2 before:-left-2.5 before:-right-1.5 before:content-[''] [-webkit-touch-callout:none] active:cursor-grabbing"
                        draggable={false}
                        onPointerDown={e => onHandleDown(e, a.id, pos.start, pos.provider, a.duration_min)}
                        onClick={e => e.stopPropagation()}
                        onContextMenu={e => e.preventDefault()}
                      >
                        <GripVertical size={15} strokeWidth={2.2} />
                      </button>
                    )}
                    <button
                      type="button"
                      tabIndex={0}
                      aria-label={`${a.client_label}, ${a.service_name}, ${fmt(pos.start)}`}
                      onClick={e => { if (!onCardClick(e)) openAppt(a.id); }}
                      className="min-w-0 flex-1 overflow-hidden px-1.5 py-1.5 text-left"
                    >
                      <div className="flex items-center gap-[5px]">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-sm" style={{ background: cat.color }} />
                        <span className="truncate text-label font-bold leading-tight tracking-[-.01em]">{a.client_label}</span>
                      </div>
                      <div className="truncate text-caption font-medium text-ink-2">{a.service_name}</div>
                      {a.note && (
                        <div className="truncate text-micro font-medium text-ink-3">{a.note}</div>
                      )}
                      <div className="mt-0.5 text-micro font-semibold tabular-nums" style={{ color: st.edge }}>
                        {fmt(pos.start)} – {fmt(pos.start + a.duration_min)}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 overflow-x-auto px-5 pb-2.5 pt-2 text-caption font-semibold text-ink-2">
        {Object.values(CATEGORIES).slice(0, 5).map(c => (
          <span key={c.label} className="flex shrink-0 items-center gap-[5px]">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: c.color }} />
            {c.label}
          </span>
        ))}
        <span className="ml-auto shrink-0 font-medium text-ink-2">Mantén para mover · toca para abrir</span>
      </div>
    </div>
  );
}
