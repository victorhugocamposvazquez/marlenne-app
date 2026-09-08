'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import { Chip, inputCls, useCloseSheet } from '@/components/Sheet';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import ChipScroller from '@/components/ui/ChipScroller';
import NextSlotControls from '@/components/agenda/NextSlotControls';
import { usePlace, type PlacePick } from '@/components/agenda/PlaceContext';
import { avatarColor } from '@/lib/categories';
import { createAppointment, slotsFor } from '@/lib/agenda-write';
import { createClient } from '@/lib/supabase/client';
import { dayKey, durLbl, fmt, minutesOfDay } from '@/lib/time';
import { bestNameMatches, fold, parseClock } from '@/lib/voice';
import { packFitsService, packIsOpen, packLabel, packUsableBy, pickPackForService } from '@/lib/packs';
import { serviceChipOrder } from '@/lib/service-pick';
import { readLastServiceId, writeLastServiceId } from '@/hooks/last-service';
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
  const [horaAMano, setHoraAMano] = useState(() => parseClock(initialHora) != null);
  const [serviceQ, setServiceQ] = useState(guessedService.length === 1 ? '' : initialServiceQ);
  const [lastId, setLastId] = useState<string | null>(null);

  useEffect(() => { setLastId(readLastServiceId()); }, []);

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
      .slice(0, 5);
  }, [query, clients, client]);

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
  const ready = !!service && !!providerId && startMin !== null && who.length > 1 && !pending;

  const pickService = useCallback((id: string) => {
    writeLastServiceId(id);
    setLastId(id);
    setServiceId(id);
  }, []);

  useEffect(() => {
    if (serviceId) writeLastServiceId(serviceId);
  }, [serviceId]);

  const onPick = useCallback((p: PlacePick) => {
    setProviderId(p.providerId);
    setStartMin(p.startMin);
    setHoraAMano(false);
  }, []);

  useEffect(() => {
    publish({
      durationMin: service?.duration_min ?? null,
      starts,
      pick: startMin != null ? { providerId, startMin } : null,
      clientLabel: who,
      serviceName: service?.name ?? '',
      onPick,
    });
  }, [service, starts, startMin, providerId, who, onPick, publish]);

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

  const whoName = providers.find(p => p.id === providerId)?.full_name.split(' ')[0];
  const slots = starts[providerId];
  const chips = useMemo(() => {
    const ordered = serviceChipOrder(services, { lastId, counts: serviceCounts });
    const q = fold(serviceQ);
    if (!q) return ordered;
    return ordered.filter(s =>
      fold(s.name).includes(q) || fold(s.category).includes(q) || fold(s.category_label ?? '').includes(q),
    );
  }, [services, lastId, serviceCounts, serviceQ]);

  return (
    <div className="shrink-0 border-t border-surface-line bg-surface-card px-3 pb-2 pt-2">
      <div className="mb-2 flex items-center gap-2">
        <p className="min-w-0 flex-1 text-label font-extrabold">Nueva cita</p>
        {service && (
          <span className="shrink-0 text-caption font-semibold text-ink-2">{durLbl(service.duration_min)}</span>
        )}
        <IconButton label="Cerrar" tone="ghost" onClick={close}>
          <X size={18} strokeWidth={2.2} />
        </IconButton>
      </div>

      {client ? (
        <div className="mb-2 flex items-center gap-2 rounded-field border border-surface-line bg-v-tint px-3 py-2">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-chip text-micro font-bold text-white"
            style={{ background: avatarColor(client.full_name) }}
          >
            {client.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-body font-bold">{client.full_name}</span>
          <IconButton label="Quitar clienta" onClick={() => { setClient(null); setQuery(''); }}>
            <X size={16} strokeWidth={2.2} />
          </IconButton>
        </div>
      ) : (
        <div className="relative mb-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" strokeWidth={2.2} />
          <input
            className={`${inputCls} pl-9 py-2.5`}
            placeholder="Clienta"
            aria-label="Clienta"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {matches.length > 0 && (
            <div className="absolute inset-x-0 bottom-full z-10 mb-1 overflow-hidden rounded-field border border-surface-line bg-surface-card shadow-card">
              {matches.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setClient(c)}
                  className="flex w-full items-center gap-2 border-b border-surface-line px-3 py-2 text-left last:border-0"
                >
                  <span className="block truncate text-body font-bold">{c.full_name}</span>
                </button>
              ))}
            </div>
          )}
          {query.trim().length > 1 && matches.length === 0 && (
            <p className="mt-1 flex items-center gap-1 text-caption font-semibold text-ink-2">
              <UserPlus size={14} strokeWidth={2.2} className="text-v" />
              Se guardará como «{query.trim()}»
            </p>
          )}
        </div>
      )}

      <div className="relative mb-1.5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" strokeWidth={2.2} />
        <input
          className={`${inputCls} pl-9 py-2`}
          placeholder="Servicio"
          aria-label="Buscar servicio"
          value={serviceQ}
          onChange={e => setServiceQ(e.target.value)}
        />
      </div>
      <ChipScroller className="mb-2" label="Servicios">
        {chips.map(s => (
          <button
            key={s.id}
            type="button"
            aria-pressed={s.id === serviceId}
            onClick={() => pickService(s.id)}
            className={`shrink-0 rounded-pill px-3 py-2 text-label font-bold ${
              s.id === serviceId
                ? 'bg-grad text-white shadow-pill'
                : 'border border-surface-line bg-surface-bg text-ink-2'
            }`}
          >
            {s.name}
          </button>
        ))}
        {chips.length === 0 && (
          <p className="shrink-0 self-center py-2 text-caption font-semibold text-ink-3">Sin coincidencias</p>
        )}
      </ChipScroller>

      {usablePacks.length > 0 && (
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

      {horaAMano && service && (
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

      <Button size="lg" full onClick={save} disabled={!ready} className="disabled:shadow-none">
        {pending
          ? 'Guardando…'
          : startMin != null
            ? `Guardar ${fmt(startMin)}${whoName ? ` · ${whoName}` : ''}`
            : who.length > 1 && service
              ? 'Toca un hueco en el día'
              : 'Clienta y servicio, luego el hueco'}
      </Button>

      {!horaAMano && (
        <button
          type="button"
          onClick={() => setHoraAMano(true)}
          className="mt-1 w-full py-1.5 text-center text-caption font-bold text-ink-3"
        >
          Hora a mano
        </button>
      )}
    </div>
  );
}
