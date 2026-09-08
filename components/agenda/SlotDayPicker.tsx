'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import { loadDayAgenda } from '@/lib/agenda-catalog';
import { slotsFor } from '@/lib/agenda-write';
import { avatarColor, catStyle, initials, STATUS } from '@/lib/categories';
import { slotGaps, snapInGap } from '@/lib/place-slots';
import { createClient } from '@/lib/supabase/client';
import {
  addDays, DAY_END, DAY_START, dateFromOffset, durLbl, fmt, minutesOfDay, offsetFromDay,
} from '@/lib/time';
import { COL_W } from '@/hooks/useDragAppointment';
import type { AgendaAppt, AgendaBlock, Provider } from '@/lib/types';

export type PlacePick = { providerId: string; startMin: number };

function dayLabel(date: string) {
  const off = offsetFromDay(date);
  const wd = dateFromOffset(off).toLocaleDateString('es-ES', {
    timeZone: 'Europe/Madrid', weekday: 'short', day: 'numeric',
  }).replace('.', '');
  if (off === 0) return `Hoy, ${wd}`;
  if (off === 1) return `Mañana, ${wd}`;
  if (off === -1) return `Ayer, ${wd}`;
  return wd.charAt(0).toUpperCase() + wd.slice(1);
}

export default function SlotDayPicker({
  date, onDate, providers, durationMin, clientLabel, serviceName,
  pick, onPick, onBack, onSave, pending, error,
}: {
  date: string;
  onDate: (day: string) => void;
  providers: Provider[];
  durationMin: number;
  clientLabel: string;
  serviceName: string;
  pick: PlacePick | null;
  onPick: (p: PlacePick) => void;
  onBack: () => void;
  onSave: () => void;
  pending?: boolean;
  error?: string | null;
}) {
  const HOUR_H = 70;
  const pxPerMin = HOUR_H / 60;
  const gridH = (DAY_END - DAY_START) * pxPerMin;
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AgendaAppt[]>([]);
  const [blocks, setBlocks] = useState<AgendaBlock[]>([]);
  const [starts, setStarts] = useState<Record<string, number[]>>({});
  const pickRef = useRef(pick);
  pickRef.current = pick;
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const scrollRef = useRef<HTMLDivElement>(null);
  const providerKey = providers.map(p => p.id).join(',');

  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onBack]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const sb = createClient();
    const ids = providerKey ? providerKey.split(',') : [];
    void Promise.all([
      loadDayAgenda(sb, date, ids),
      Promise.all(ids.map(id => slotsFor(sb, id, date, durationMin))),
    ]).then(([agenda, lists]) => {
      if (!alive) return;
      setAppointments(agenda.appointments);
      setBlocks(agenda.blocks);
      const next: Record<string, number[]> = {};
      ids.forEach((id, i) => { next[id] = lists[i]; });
      setStarts(next);
      setLoading(false);
      const cur = pickRef.current;
      if (cur && (next[cur.providerId] ?? []).includes(cur.startMin)) return;
      for (let i = 0; i < ids.length; i++) {
        const g = slotGaps(lists[i] ?? [])[0];
        if (g) {
          onPickRef.current({ providerId: ids[i], startMin: g.first });
          return;
        }
      }
    }).catch(() => {
      if (alive) setLoading(false);
    });
    return () => { alive = false; };
  }, [date, durationMin, providerKey]);

  const gapsBy = useMemo(() => {
    const m = new Map<string, ReturnType<typeof slotGaps>>();
    for (const p of providers) m.set(p.id, slotGaps(starts[p.id] ?? []));
    return m;
  }, [providers, starts]);

  const pills = useMemo(() => {
    const rows: PlacePick[] = [];
    for (const p of providers) {
      for (const g of gapsBy.get(p.id) ?? []) rows.push({ providerId: p.id, startMin: g.first });
    }
    rows.sort((a, b) => a.startMin - b.startMin || a.providerId.localeCompare(b.providerId));
    if (pick && !rows.some(r => r.providerId === pick.providerId && r.startMin === pick.startMin)) {
      rows.unshift(pick);
    }
    return rows.slice(0, 8);
  }, [providers, gapsBy, pick]);

  const totalHuecos = useMemo(
    () => [...gapsBy.values()].reduce((n, g) => n + g.length, 0),
    [gapsBy],
  );

  const who = providers.find(p => p.id === pick?.providerId);
  const solo = providers.length <= 1;
  const hours = [];
  for (let m = DAY_START; m <= DAY_END; m += 60) hours.push({ label: fmt(m), top: (m - DAY_START) * pxPerMin });

  const tapGap = (providerId: string, first: number, last: number, clientY: number, el: HTMLElement) => {
    const y = clientY - el.getBoundingClientRect().top;
    const raw = DAY_START + y / pxPerMin;
    onPick({ providerId, startMin: snapInGap(raw, { first, last }) });
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-surface-bg" role="dialog" aria-modal="true" aria-label="Huecos del día">
      <div className="shrink-0 border-b border-surface-line px-3 pb-3 pt-[max(10px,env(safe-area-inset-top))]">
        <div className="mb-2 flex items-center gap-2">
          <IconButton label="Volver al formulario" tone="ghost" onClick={onBack}>
            <ChevronLeft size={22} strokeWidth={2.2} />
          </IconButton>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-extrabold leading-tight">{clientLabel} · {serviceName}</p>
            <p className="text-caption font-semibold text-ink-2">{durLbl(durationMin)}</p>
          </div>
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-icon text-caption font-bold text-white"
            style={{ background: avatarColor(clientLabel) }}
          >
            {initials(clientLabel)}
          </span>
          <IconButton label="Volver al formulario" tone="ghost" onClick={onBack}>
            <X size={18} strokeWidth={2.2} />
          </IconButton>
        </div>
        <div className="flex items-center gap-2">
          <IconButton label="Día anterior" onClick={() => onDate(addDays(date, -1))}>
            <ChevronLeft size={18} strokeWidth={2.2} />
          </IconButton>
          <p className="min-w-0 flex-1 text-center text-body font-bold">{dayLabel(date)}</p>
          <IconButton label="Día siguiente" onClick={() => onDate(addDays(date, 1))}>
            <ChevronRight size={18} strokeWidth={2.2} />
          </IconButton>
          <span className="shrink-0 rounded-pill bg-v-soft px-2.5 py-1 text-micro font-bold text-v-d">
            {loading ? '…' : `${totalHuecos} ${totalHuecos === 1 ? 'hueco' : 'huecos'}`}
          </span>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto pb-2">
        <div className={solo ? 'w-full pr-3.5' : 'min-w-max pr-3.5'}>
          <div className="sticky top-0 z-[6] flex bg-[linear-gradient(180deg,rgb(var(--c-bg))_74%,rgb(var(--c-bg)/0))] pb-2 pt-1">
            <div className="sticky left-0 z-[7] w-[46px] shrink-0 bg-surface-bg" />
            {providers.map(p => (
              <div
                key={p.id}
                className={solo ? 'min-w-0 flex-1 pr-2' : 'shrink-0 pr-2'}
                style={solo ? undefined : { width: COL_W }}
              >
                <div
                  className="rounded-pill bg-surface-card px-2.5 py-1.5 text-caption font-extrabold uppercase tracking-wide"
                  style={{ borderBottom: `3px solid ${p.color ?? avatarColor(p.full_name)}` }}
                >
                  {p.full_name.split(' ')[0]}
                </div>
              </div>
            ))}
          </div>
          <div className="flex">
            <div className="sticky left-0 z-[5] w-[46px] shrink-0 bg-surface-bg" style={{ height: gridH }}>
              {hours.map(h => (
                <div key={h.label} className="absolute right-2 -translate-y-1.5 text-micro font-semibold tabular-nums text-ink-3" style={{ top: h.top }}>
                  {h.label}
                </div>
              ))}
            </div>
            <div
              className={solo ? 'relative min-w-0 flex-1' : 'relative'}
              style={{ height: gridH, width: solo ? undefined : providers.length * COL_W }}
            >
              {hours.map(h => (
                <div key={h.label} className="absolute inset-x-0 h-px bg-grid-h" style={{ top: h.top }} />
              ))}
              {providers.slice(1).map((_, i) => (
                <div key={i} className="absolute top-0 w-px bg-grid-v" style={{ left: (i + 1) * COL_W - 4, height: gridH }} />
              ))}

              {providers.map((p, col) => (
                <div
                  key={`gaps-${p.id}`}
                  className="absolute top-0"
                  style={{ left: solo ? 0 : col * COL_W, width: solo ? '100%' : COL_W, height: gridH }}
                >
                  {(gapsBy.get(p.id) ?? []).map(g => {
                    const top = (g.first - DAY_START) * pxPerMin + 2;
                    const h = (g.last + durationMin - g.first) * pxPerMin - 6;
                    return (
                      <button
                        key={`${p.id}-${g.first}`}
                        type="button"
                        aria-label={`Hueco ${fmt(g.first)} con ${p.full_name.split(' ')[0]}`}
                        onClick={e => tapGap(p.id, g.first, g.last, e.clientY, e.currentTarget)}
                        className="absolute left-0.5 right-[9px] rounded-pill border border-dashed border-v/50 bg-v-soft/80"
                        style={{ top, height: Math.max(h, durationMin * pxPerMin - 6) }}
                      >
                        <span className="block px-2 pt-1 text-left text-micro font-bold tabular-nums text-ink">
                          {fmt(g.first)} · {durLbl(durationMin)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}

              {blocks.map(b => {
                const col = providers.findIndex(p => p.id === b.provider_id);
                if (col < 0) return null;
                const start = minutesOfDay(b.starts_at);
                return (
                  <div
                    key={b.id}
                    className="pointer-events-none absolute left-0.5 flex items-center justify-center rounded-icon border border-dashed border-handle bg-block/80 text-micro font-bold text-ink-3"
                    style={{
                      left: solo ? 2 : col * COL_W + 2,
                      width: solo ? 'calc(100% - 14px)' : COL_W - 14,
                      top: (start - DAY_START) * pxPerMin + 2,
                      height: b.duration_min * pxPerMin - 6,
                    }}
                  >
                    {b.label ?? b.reason}
                  </div>
                );
              })}

              {appointments.map(a => {
                const col = providers.findIndex(p => p.id === a.provider_id);
                if (col < 0) return null;
                const st = STATUS[a.status];
                const cat = catStyle(a.category, { color: a.service_color });
                const start = minutesOfDay(a.starts_at);
                return (
                  <div
                    key={a.id}
                    className="pointer-events-none absolute flex overflow-hidden rounded-pill opacity-[.55]"
                    style={{
                      left: solo ? 0 : col * COL_W,
                      width: solo ? 'calc(100% - 8px)' : COL_W - 8,
                      top: (start - DAY_START) * pxPerMin + 2,
                      height: a.duration_min * pxPerMin - 6,
                      background: st.bg,
                      border: `1px solid ${st.border}`,
                      borderLeft: `4px solid ${st.edge}`,
                    }}
                  >
                    <div className="min-w-0 flex-1 overflow-hidden px-1.5 py-1 text-left">
                      <div className="flex items-center gap-[5px]">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-sm" style={{ background: cat.color }} />
                        <span className="truncate text-label font-bold">{a.client_label}</span>
                      </div>
                      <div className="truncate text-caption font-medium text-ink-2">{fmt(start)}</div>
                    </div>
                  </div>
                );
              })}

              {pick && (() => {
                const col = providers.findIndex(p => p.id === pick.providerId);
                if (col < 0) return null;
                return (
                  <div
                    className="pointer-events-none absolute z-[4] overflow-hidden rounded-pill bg-grad text-white shadow-btn"
                    style={{
                      left: solo ? 0 : col * COL_W,
                      width: solo ? 'calc(100% - 8px)' : COL_W - 8,
                      top: (pick.startMin - DAY_START) * pxPerMin + 2,
                      height: durationMin * pxPerMin - 6,
                    }}
                  >
                    <div className="px-2 py-1.5">
                      <p className="text-label font-extrabold tabular-nums">
                        {fmt(pick.startMin)} → {fmt(pick.startMin + durationMin)}
                      </p>
                      <p className="text-micro font-semibold text-white/90">
                        {who?.full_name.split(' ')[0]}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-surface-line bg-surface-card px-3 pt-2 pb-[max(12px,env(safe-area-inset-bottom))]">
        {error && (
          <p className="mb-2 rounded-chip bg-danger-bg px-3 py-2 text-label font-semibold text-danger-fg">{error}</p>
        )}
        {!loading && totalHuecos === 0 && (
          <p className="mb-2 text-center text-label font-semibold text-ink-2">
            Ese día no cabe. Prueba el siguiente.
          </p>
        )}
        {pills.length > 0 && (
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
            {pills.map(s => {
              const name = providers.find(p => p.id === s.providerId)?.full_name.split(' ')[0] ?? '';
              const on = pick?.providerId === s.providerId && pick.startMin === s.startMin;
              return (
                <button
                  key={`${s.providerId}-${s.startMin}`}
                  type="button"
                  onClick={() => onPick(s)}
                  className={`shrink-0 rounded-pill px-3 py-2 text-label font-bold ${
                    on ? 'bg-grad text-white shadow-pill' : 'border border-surface-line bg-surface-bg text-ink-2'
                  }`}
                >
                  {fmt(s.startMin)}{providers.length > 1 ? ` ${name}` : ''}
                </button>
              );
            })}
          </div>
        )}
        <Button size="lg" full onClick={onSave} disabled={!pick || pending}>
          <Check size={18} strokeWidth={2.4} />
          {pending ? 'Guardando…' : pick ? `Guardar ${fmt(pick.startMin)}` : 'Elige un hueco'}
        </Button>
        {pick && who && (
          <p className="mt-1.5 text-center text-caption font-semibold text-ink-2">
            {who.full_name.split(' ')[0]} · {durLbl(durationMin)}
          </p>
        )}
        <button type="button" onClick={onBack} className="mt-2 w-full py-2 text-center text-caption font-bold text-ink-3">
          Hora a mano
        </button>
      </div>
    </div>,
    document.body,
  );
}
