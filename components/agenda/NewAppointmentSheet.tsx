'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Check, ChevronLeft, Search, UserPlus, X } from 'lucide-react';
import { inputCls, useCloseSheet } from '@/components/Sheet';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import Chip from '@/components/ui/Chip';
import WeekStrip from '@/components/agenda/WeekStrip';
import NextSlotControls from '@/components/agenda/NextSlotControls';
import { avatarColor, catStyle, initials } from '@/lib/categories';
import { createAppointment, slotsFor } from '@/lib/agenda-write';
import { createClient } from '@/lib/supabase/client';
import { dateFromOffset, dayKey, durLbl, fmt, minutesOfDay, offsetFromDay } from '@/lib/time';
import { bestNameMatches, fold, parseClock } from '@/lib/voice';
import { packFitsService, packIsOpen, packLabel, packUsableBy, pickPackForService } from '@/lib/packs';
import { servicePickSections } from '@/lib/service-pick';
import { readLastServiceId, writeLastServiceId } from '@/hooks/last-service';
import { AFTERNOON_START, eurosLbl } from '@/lib/week-view';
import type { ClientOption, ClientPack, Provider, ServiceOption } from '@/lib/types';

function StepTitle({ n, children }: { n: number; children: string }) {
  return (
    <h2 className="mb-2.5 flex items-center gap-2.5 text-body-lg font-extrabold">
      <span className="grid h-8 w-8 place-items-center rounded-pill bg-v-soft text-label font-extrabold text-v-d">
        {n}
      </span>
      {children}
    </h2>
  );
}

function HourGroup({
  title, slots, selected, onPick,
}: {
  title: string;
  slots: number[];
  selected: number | null;
  onPick: (m: number) => void;
}) {
  return (
    <div className="mb-3">
      <p className="mb-1.5 text-caption font-bold uppercase tracking-[.04em] text-ink-2">{title}</p>
      <div className="grid grid-cols-4 gap-2">
        {slots.map(m => {
          const on = m === selected;
          return (
            <button
              key={m}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(m)}
              className={`min-h-[48px] rounded-field text-label font-extrabold tabular-nums ${
                on ? 'bg-grad text-white shadow-pill' : 'border border-surface-line bg-surface-card text-ink'
              }`}
            >
              {fmt(m)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function NewAppointmentSheet({
  day, providers, services, clients, packs = [], serviceCounts = {}, preselected = null,
  initialName = '', initialHora = '', initialServiceQ = '', initialProviderId,
}: {
  day: string;
  providers: Provider[];
  services: ServiceOption[];
  clients: ClientOption[];
  packs?: ClientPack[];
  serviceCounts?: Record<string, number>;
  preselected?: ClientOption | null;
  initialName?: string;
  initialHora?: string;
  initialServiceQ?: string;
  initialProviderId?: string;
}) {
  const close = useCloseSheet();
  const [pending, startTransition] = useTransition();

  const guessedService = initialServiceQ
    ? bestNameMatches(services, initialServiceQ, s => s.name)
    : [];
  const [query, setQuery] = useState(preselected ? '' : initialName);
  const [client, setClient] = useState<ClientOption | null>(preselected);
  const [serviceId, setServiceId] = useState(guessedService.length === 1 ? guessedService[0].id : '');
  const [serviceQ, setServiceQ] = useState(guessedService.length === 1 ? '' : initialServiceQ);
  const [providerId, setProviderId] = useState(
    initialProviderId && providers.some(p => p.id === initialProviderId)
      ? initialProviderId
      : (providers[0]?.id ?? ''),
  );
  const [date, setDate] = useState(day);
  const [startMin, setStartMin] = useState<number | null>(parseClock(initialHora));
  const [starts, setStarts] = useState<Record<string, number[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [packId, setPackId] = useState('');
  const [lastId, setLastId] = useState<string | null>(null);

  const clientRef = useRef<HTMLInputElement>(null);
  const whoRef = useRef<HTMLDivElement>(null);
  const svcRef = useRef<HTMLDivElement>(null);
  const whenRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLastId(readLastServiceId()); }, []);
  useEffect(() => { setDate(day); }, [day]);

  const service = services.find(s => s.id === serviceId) ?? null;
  const usablePacks = client && serviceId
    ? packs.filter(p => packUsableBy(p, client.id) && packFitsService(p, serviceId) && packIsOpen(p))
    : [];
  const providerKey = providers.map(p => p.id).join(',');

  const matches = useMemo(() => {
    const q = fold(query);
    const digits = query.replace(/\D/g, '');
    if ((!q && !digits) || client) return [];
    return clients
      .filter(c => (q && fold(c.full_name).includes(q)) || (digits.length >= 3 && (c.phone ?? '').includes(digits)))
      .slice(0, 12);
  }, [query, clients, client]);

  const catalog = useMemo(
    () => servicePickSections(services, { lastId, counts: serviceCounts, query: serviceQ }),
    [services, lastId, serviceCounts, serviceQ],
  );

  useEffect(() => {
    if (!service) { setStarts({}); return; }
    let alive = true;
    const ids = providerKey ? providerKey.split(',') : [];
    void Promise.all(ids.map(id => slotsFor(createClient(), id, date, service.duration_min))).then(lists => {
      if (!alive) return;
      const next: Record<string, number[]> = {};
      ids.forEach((id, i) => { next[id] = lists[i]; });
      setStarts(next);
    });
    return () => { alive = false; };
  }, [service, date, providerKey]);

  useEffect(() => {
    if (startMin === null) return;
    const list = starts[providerId];
    if (!list) return;
    if (!list.includes(startMin)) setStartMin(null);
  }, [starts, startMin, providerId]);

  useEffect(() => {
    if (!client || !serviceId) { setPackId(''); return; }
    const picked = pickPackForService(packs, client.id, serviceId);
    setPackId(picked?.id ?? '');
  }, [client?.id, serviceId, packs]);

  const who = client?.full_name ?? query.trim();
  const missingClient = who.length <= 1;
  const missingService = !service;
  const missingHour = startMin === null;
  const ready = !missingClient && !missingService && !!providerId && !missingHour && !pending;

  const pickService = useCallback((id: string) => {
    writeLastServiceId(id);
    setServiceId(id);
  }, []);

  const save = () => {
    if (!ready || !service || startMin === null) return;
    setError(null);
    startTransition(async () => {
      const r = await createAppointment(createClient(), {
        clientId: client?.id,
        clientName: client ? undefined : who,
        serviceId: service.id,
        providerId,
        date,
        startMin,
        clientPackId: packId || undefined,
      });
      if (r.ok) close();
      else setError(r.error ?? 'No se ha podido guardar la cita');
    });
  };

  const goToMissing = () => {
    if (missingClient) {
      whoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      clientRef.current?.focus();
      return;
    }
    if (missingService) {
      svcRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (missingHour) {
      whenRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    save();
  };

  const whoName = providers.find(p => p.id === providerId)?.full_name.split(' ')[0];
  const slots = starts[providerId];
  const recap = [who || null, service?.name ?? null, startMin != null ? fmt(startMin) : null]
    .filter(Boolean)
    .join(' · ');
  const morning = (slots ?? []).filter(m => m < AFTERNOON_START);
  const afternoon = (slots ?? []).filter(m => m >= AFTERNOON_START);
  const dayOffset = offsetFromDay(date);

  const cta = pending
    ? 'Guardando…'
    : missingClient
      ? 'Falta la clienta'
      : missingService
        ? 'Falta el servicio'
        : missingHour
          ? 'Falta la hora'
          : `Guardar ${fmt(startMin!)}${whoName ? ` · ${whoName}` : ''}`;

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-surface-bg">
      <header className="shrink-0 border-b border-surface-line bg-surface-card px-3 py-2.5">
        <div className="flex items-center gap-2">
          <IconButton label="Volver a la agenda" tone="card" onClick={close}>
            <ChevronLeft size={22} strokeWidth={2.4} />
          </IconButton>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-title font-extrabold leading-tight">Nueva cita</h1>
            <p className="truncate text-caption font-semibold text-ink-2">
              {recap || 'Clienta, servicio y hora'}
            </p>
          </div>
          <IconButton label="Cerrar" tone="ghost" onClick={close}>
            <X size={18} strokeWidth={2.2} />
          </IconButton>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4">
        <div ref={whoRef} className="mb-8 scroll-mt-3">
          <StepTitle n={1}>Clienta</StepTitle>
          {client ? (
            <div className="flex items-center gap-3 rounded-field border border-v/30 bg-v-tint px-3 py-3">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-chip text-label font-bold text-white"
                style={{ background: avatarColor(client.full_name) }}
              >
                {initials(client.full_name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-extrabold">{client.full_name}</p>
                {client.phone && (
                  <p className="truncate text-caption font-semibold text-ink-2">{client.phone}</p>
                )}
              </div>
              <button
                type="button"
                aria-label="Cambiar clienta"
                onClick={() => { setClient(null); setQuery(''); }}
                className="grid h-11 w-11 shrink-0 place-items-center text-ink-2"
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" strokeWidth={2.2} />
                <input
                  ref={clientRef}
                  className={`${inputCls} pl-10`}
                  placeholder="Nombre o teléfono"
                  aria-label="Buscar clienta"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              {matches.length > 0 && (
                <ul className="mt-2 overflow-hidden rounded-field border border-surface-line bg-surface-card">
                  {matches.map(c => (
                    <li key={c.id} className="border-b border-surface-line last:border-0">
                      <button
                        type="button"
                        onClick={() => setClient(c)}
                        className="flex w-full min-h-[52px] items-center gap-3 px-3 py-2.5 text-left"
                      >
                        <span
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-chip text-micro font-bold text-white"
                          style={{ background: avatarColor(c.full_name) }}
                        >
                          {initials(c.full_name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body font-bold">{c.full_name}</span>
                          {c.phone && (
                            <span className="block truncate text-caption font-semibold text-ink-2">{c.phone}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {query.trim().length > 1 && matches.length === 0 && (
                <p className="mt-2 flex items-center gap-2 rounded-field bg-v-tint px-3 py-2.5 text-label font-semibold text-v-d">
                  <UserPlus size={16} strokeWidth={2.2} />
                  Se guardará como clienta nueva: «{query.trim()}»
                </p>
              )}
            </>
          )}
        </div>

        <div ref={svcRef} className="mb-8 scroll-mt-3">
          <StepTitle n={2}>Servicio</StepTitle>
          <div className="relative mb-3">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" strokeWidth={2.2} />
            <input
              className={`${inputCls} pl-10`}
              placeholder="Buscar servicio"
              aria-label="Buscar servicio"
              value={serviceQ}
              onChange={e => setServiceQ(e.target.value)}
            />
          </div>
          {catalog.length === 0 ? (
            <p className="rounded-field border border-dashed border-handle px-3 py-6 text-center text-label font-semibold text-ink-2">
              No hay ningún servicio con «{serviceQ.trim()}».
            </p>
          ) : catalog.map(sec => (
            <section key={sec.key} className="mb-3">
              <h3 className="mb-1 px-0.5 text-caption font-bold uppercase tracking-[.04em] text-ink-2">
                {sec.title}
              </h3>
              <div className="overflow-hidden rounded-field border border-surface-line bg-surface-card">
                {sec.items.map(s => {
                  const cat = catStyle(s.category, { label: s.category_label, color: s.category_color });
                  const on = s.id === serviceId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => pickService(s.id)}
                      className={`flex w-full min-h-[56px] items-center gap-3 border-b border-surface-line px-3 py-2.5 text-left last:border-0 ${
                        on ? 'bg-v-tint' : ''
                      }`}
                    >
                      <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: cat.color }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body font-bold">{s.name}</span>
                        <span className="block text-caption font-semibold text-ink-2">
                          {durLbl(s.duration_min)}
                          {s.price_cents ? ` · ${eurosLbl(s.price_cents / 100)}` : ''}
                        </span>
                      </span>
                      {on && <Check size={18} strokeWidth={2.4} className="shrink-0 text-v" />}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          {usablePacks.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-caption font-bold uppercase tracking-[.04em] text-ink-2">Bono</p>
              <div className="flex flex-wrap gap-2">
                <Chip active={!packId} onClick={() => setPackId('')}>Sin bono</Chip>
                {usablePacks.map(p => (
                  <Chip key={p.id} active={packId === p.id} onClick={() => setPackId(p.id)}>
                    {packLabel(p)}
                    {p.owner_client_id !== client?.id ? ' · amiga' : ''}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </div>

        <div ref={whenRef} className="mb-4 scroll-mt-3">
          <StepTitle n={3}>Día y hora</StepTitle>
          <WeekStrip
            selectedOffset={dayOffset}
            onSelect={off => {
              setDate(dayKey(dateFromOffset(off)));
              setStartMin(null);
            }}
          />

          {providers.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {providers.map(p => (
                <Chip
                  key={p.id}
                  active={providerId === p.id}
                  onClick={() => { setProviderId(p.id); setStartMin(null); }}
                >
                  {p.full_name.split(' ')[0]}
                </Chip>
              ))}
            </div>
          )}

          {!service ? (
            <p className="mt-4 rounded-field border border-dashed border-handle px-3 py-5 text-center text-label font-semibold text-ink-2">
              Elige el servicio para ver los huecos libres.
            </p>
          ) : (
            <div className="mt-4">
              <div className="mb-3 flex flex-wrap gap-2">
                <NextSlotControls
                  durationMin={service.duration_min}
                  providerId={providerId}
                  anyProviders={providers.length > 1}
                  onPick={slot => {
                    setDate(dayKey(slot.startsAt));
                    setProviderId(slot.providerId);
                    setStartMin(minutesOfDay(slot.startsAt));
                  }}
                />
              </div>
              {slots == null ? (
                <p className="text-label font-semibold text-ink-3">Buscando huecos…</p>
              ) : slots.length === 0 ? (
                <p className="rounded-field bg-danger-bg px-3 py-3 text-label font-semibold text-danger-fg">
                  No queda hueco de {durLbl(service.duration_min)} este día. Prueba otro día arriba.
                </p>
              ) : (
                <>
                  {morning.length > 0 && (
                    <HourGroup title="Mañana" slots={morning} selected={startMin} onPick={setStartMin} />
                  )}
                  {afternoon.length > 0 && (
                    <HourGroup title="Tarde" slots={afternoon} selected={startMin} onPick={setStartMin} />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="shrink-0 px-4 pb-2 text-label font-semibold text-danger-fg">{error}</p>
      )}

      <div className="shrink-0 border-t border-surface-line bg-surface-card px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] standalone:pb-[max(12px,calc(env(safe-area-inset-bottom)-12px))]">
        <Button size="lg" full onClick={goToMissing} disabled={pending} className="disabled:shadow-none">
          {cta}
        </Button>
      </div>
    </div>
  );
}
