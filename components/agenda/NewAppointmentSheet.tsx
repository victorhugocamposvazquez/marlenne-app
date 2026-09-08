'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { Chip, useCloseSheet } from '@/components/Sheet';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import ChipScroller from '@/components/ui/ChipScroller';
import ClientPicker from '@/components/agenda/ClientPicker';
import NextSlotControls from '@/components/agenda/NextSlotControls';
import ServicePicker from '@/components/agenda/ServicePicker';
import { usePlace, type PlacePick } from '@/components/agenda/PlaceContext';
import { avatarColor, initials } from '@/lib/categories';
import { createAppointment, slotsFor } from '@/lib/agenda-write';
import { createClient } from '@/lib/supabase/client';
import { dayKey, durLbl, fmt, minutesOfDay } from '@/lib/time';
import { bestNameMatches, parseClock } from '@/lib/voice';
import { packFitsService, packIsOpen, packLabel, packUsableBy, pickPackForService } from '@/lib/packs';
import { newAppointmentCta } from '@/lib/new-appointment-cta';
import { readLastServiceId, writeLastServiceId } from '@/hooks/last-service';
import { useSheetResize } from '@/hooks/useSheetResize';
import type { ClientOption, ClientPack, Provider, ServiceOption } from '@/lib/types';

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
  const { publish } = usePlace();
  const { height, dragging, onHandleDown, ensureMid } = useSheetResize();
  const [pending, startTransition] = useTransition();

  const guessedService = initialServiceQ
    ? bestNameMatches(services, initialServiceQ, s => s.name)
    : [];
  const [query, setQuery] = useState(preselected ? '' : initialName);
  const [client, setClient] = useState<ClientOption | null>(preselected);
  const [serviceId, setServiceId] = useState(guessedService.length === 1 ? guessedService[0].id : '');
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
  const [step, setStep] = useState<'who' | 'when'>(() =>
    parseClock(initialHora) != null && guessedService.length === 1 ? 'when' : 'who',
  );
  const [picker, setPicker] = useState<'client' | 'service' | null>(() => {
    if (preselected || initialName.trim().length > 1) {
      return guessedService.length === 1 ? null : 'service';
    }
    return 'client';
  });
  const [nudge, setNudge] = useState(false);
  const nudgeTimer = useRef(0);
  const serviceSearchRef = useRef<HTMLInputElement>(null);
  const clientRef = useRef<HTMLInputElement>(null);
  const [orderLastId, setOrderLastId] = useState<string | null>(null);

  useEffect(() => { setOrderLastId(readLastServiceId()); }, []);

  const service = services.find(s => s.id === serviceId) ?? null;
  const usablePacks = client && serviceId
    ? packs.filter(p => packUsableBy(p, client.id) && packFitsService(p, serviceId) && packIsOpen(p))
    : [];
  const providerKey = providers.map(p => p.id).join(',');

  useEffect(() => { setDate(day); }, [day]);

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
  const canNext = !missingClient && !missingService && !pending;
  const ready = canNext && !!providerId && startMin !== null;
  const cta = newAppointmentCta({
    missingClient,
    missingService,
    hasTime: startMin != null,
    pending,
    step,
  });

  const pickService = useCallback((id: string) => {
    writeLastServiceId(id);
    setServiceId(id);
    setPicker(null);
  }, []);

  const openPicker = useCallback((next: 'client' | 'service') => {
    setPicker(next);
    ensureMid();
    setNudge(true);
    window.clearTimeout(nudgeTimer.current);
    nudgeTimer.current = window.setTimeout(() => setNudge(false), 800);
    queueMicrotask(() => {
      if (next === 'client') clientRef.current?.focus();
      else serviceSearchRef.current?.focus();
    });
  }, [ensureMid]);

  useEffect(() => () => window.clearTimeout(nudgeTimer.current), []);

  useEffect(() => {
    if (serviceId) writeLastServiceId(serviceId);
  }, [serviceId]);

  const onPick = useCallback((p: PlacePick) => {
    setProviderId(p.providerId);
    setStartMin(p.startMin);
    setStep('when');
  }, []);

  useEffect(() => {
    if (!service || missingClient) {
      publish(null);
      return;
    }
    publish({
      durationMin: service.duration_min,
      starts,
      pick: startMin != null ? { providerId, startMin } : null,
      clientLabel: who,
      serviceName: service.name,
      onPick,
    });
  }, [service, missingClient, starts, startMin, providerId, who, onPick, publish]);

  useEffect(() => () => publish(null), [publish]);

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

  const slots = starts[providerId];
  const recap = [who || null, service?.name ?? null, startMin != null ? fmt(startMin) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      data-no-pull
      className="relative z-[8] flex shrink-0 flex-col overflow-hidden rounded-t-sheet border-t border-surface-line bg-surface-card shadow-toast"
      style={{
        height,
        transition: dragging ? 'none' : 'height .28s cubic-bezier(.2,.9,.3,1)',
      }}
    >
      <div
        data-no-pull
        data-sheet-handle
        role="slider"
        aria-label="Arrastra para agrandar o encoger el formulario"
        aria-valuemin={0}
        aria-valuemax={2}
        aria-valuetext="Tamaño del formulario"
        className="flex min-h-12 w-full shrink-0 select-none items-center justify-center bg-surface-card [-webkit-touch-callout:none] [-webkit-user-select:none]"
        style={{ touchAction: 'none' }}
        onPointerDown={onHandleDown}
        onTouchStart={e => e.preventDefault()}
      >
        <span aria-hidden className="pointer-events-none h-1 w-10 rounded-full bg-handle" />
      </div>

      <div
        data-no-pull
        className="flex shrink-0 select-none items-center gap-1 bg-surface-card px-3 [-webkit-user-select:none]"
        style={{ touchAction: 'none' }}
        onPointerDown={e => {
          if ((e.target as HTMLElement).closest('button, a, input')) return;
          onHandleDown(e);
        }}
      >
        {step === 'when' && (
          <IconButton label="Volver" tone="ghost" onClick={() => setStep('who')}>
            <ChevronLeft size={20} strokeWidth={2.2} />
          </IconButton>
        )}
        {recap ? (
          <ChipScroller className="min-w-0 flex-1" label="Resumen de la cita">
            {step === 'when' ? (
              <button
                type="button"
                onClick={() => setStep('who')}
                className="whitespace-nowrap text-left text-label font-extrabold"
              >
                {recap}
              </button>
            ) : (
              <p className="whitespace-nowrap text-label font-extrabold">{recap}</p>
            )}
          </ChipScroller>
        ) : (
          <p className="min-w-0 flex-1 text-label font-extrabold">Nueva cita</p>
        )}
        {service && (
          <span className="shrink-0 text-caption font-semibold text-ink-2">{durLbl(service.duration_min)}</span>
        )}
        <IconButton label="Cerrar" tone="ghost" onClick={close}>
          <X size={18} strokeWidth={2.2} />
        </IconButton>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pt-2">
      {step === 'who' && picker === 'client' && (
        <ClientPicker
          fill
          clients={clients}
          query={query}
          onQuery={setQuery}
          onPick={c => {
            setClient(c);
            setQuery('');
            setPicker(service ? null : 'service');
          }}
          inputRef={clientRef}
          nudge={nudge && picker === 'client'}
        />
      )}

      {step === 'who' && picker !== 'client' && (client || who.length > 1) && (
        <div className="mb-2 flex shrink-0 items-center gap-2 rounded-pill border border-surface-line bg-v-tint px-2.5 py-1.5">
          <span
            className="grid h-6 w-6 shrink-0 place-items-center rounded-chip text-micro font-bold text-white"
            style={{ background: avatarColor(who) }}
          >
            {initials(who)}
          </span>
          <button
            type="button"
            onClick={() => openPicker('client')}
            className="min-w-0 flex-1 truncate text-left text-label font-bold"
          >
            {who}
          </button>
          <button
            type="button"
            aria-label="Quitar clienta"
            onClick={() => { setClient(null); setQuery(''); openPicker('client'); }}
            className="grid h-8 w-8 shrink-0 place-items-center text-ink-2"
          >
            <X size={14} strokeWidth={2.2} />
          </button>
        </div>
      )}

      {step === 'who' && picker === 'service' && (
        <ServicePicker
          fill
          open
          services={services}
          lastId={orderLastId}
          counts={serviceCounts}
          selectedId={serviceId}
          initialQuery={initialServiceQ}
          onPick={pickService}
          inputRef={serviceSearchRef}
          nudge={nudge && picker === 'service'}
        />
      )}

      {step === 'who' && picker !== 'client' && picker !== 'service' && service && (
        <button
          type="button"
          onClick={() => openPicker('service')}
          className="mb-2 flex w-full items-center gap-2 rounded-pill border border-surface-line bg-surface-bg px-2.5 py-1.5 text-left"
        >
          <span className="min-w-0 flex-1 truncate text-label font-bold">{service.name}</span>
          <span className="shrink-0 text-caption font-semibold text-ink-2">{durLbl(service.duration_min)}</span>
          <span className="shrink-0 text-caption font-bold text-v">Cambiar</span>
        </button>
      )}

      {step === 'who' && usablePacks.length > 0 && (
        <ChipScroller className="mb-2" label="Bonos">
          <Chip className="shrink-0" active={!packId} onClick={() => setPackId('')}>Sin bono</Chip>
          {usablePacks.map(p => (
            <Chip className="shrink-0" key={p.id} active={packId === p.id} onClick={() => setPackId(p.id)}>
              {packLabel(p)}
              {p.owner_client_id !== client?.id ? ' · amiga' : ''}
            </Chip>
          ))}
        </ChipScroller>
      )}

      {step === 'when' && service && (
        <ChipScroller className="mb-2" label="Horas">
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
          {slots == null ? (
            <p className="shrink-0 self-center text-caption font-semibold text-ink-3">Buscando…</p>
          ) : slots.length === 0 ? (
            <p className="shrink-0 self-center text-caption font-semibold text-ink-2">
              No queda hueco de {durLbl(service.duration_min)}.
            </p>
          ) : (
            slots.map(m => (
              <Chip className="shrink-0" key={m} active={m === startMin} onClick={() => setStartMin(m)}>
                <span className="tabular-nums">{fmt(m)}</span>
              </Chip>
            ))
          )}
        </ChipScroller>
      )}

      {error && (
        <p className="mb-2 rounded-chip bg-danger-bg px-3 py-2 text-label font-semibold text-danger-fg">{error}</p>
      )}
      </div>

      <div className="shrink-0 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-1 standalone:pb-[max(8px,calc(env(safe-area-inset-bottom)-12px))]">
      <Button
        size="lg"
        full
        onClick={() => {
          if (cta.kind === 'client') {
            if (step === 'when') setStep('who');
            openPicker('client');
            return;
          }
          if (cta.kind === 'service') {
            if (step === 'when') setStep('who');
            openPicker('service');
            return;
          }
          if (cta.kind === 'time') {
            setStep('when');
            return;
          }
          if (cta.kind === 'save') save();
        }}
        disabled={pending || (cta.kind === 'save' && !ready) || (cta.kind === 'time' && step === 'when')}
        className="disabled:shadow-none"
      >
        {cta.label}
      </Button>
      </div>
    </div>
  );
}
