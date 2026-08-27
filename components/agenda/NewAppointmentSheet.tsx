'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import Sheet, { Chip, Field, inputCls, useCloseSheet } from '@/components/Sheet';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import NextSlotControls from '@/components/agenda/NextSlotControls';
import { CATEGORIES, avatarColor } from '@/lib/categories';
import { createAppointment, slotsFor } from '@/lib/agenda-write';
import { createClient } from '@/lib/supabase/client';
import { dayKey, durLbl, fmt, minutesOfDay } from '@/lib/time';
import { bestNameMatches, fold, parseClock } from '@/lib/voice';
import type { ClientOption, Provider, ServiceOption } from '@/lib/types';

export default function NewAppointmentSheet({
  day, providers, services, clients, preselected = null,
  initialName = '', initialHora = '', initialServiceQ = '', initialProviderId,
}: {
  day: string;
  providers: Provider[];
  services: ServiceOption[];
  clients: ClientOption[];
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
  const [providerId, setProviderId] = useState(
    initialProviderId && providers.some(p => p.id === initialProviderId)
      ? initialProviderId
      : (providers[0]?.id ?? ''),
  );
  const [date, setDate] = useState(day);
  const [startMin, setStartMin] = useState<number | null>(parseClock(initialHora));
  const [slots, setSlots] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serviceQ, setServiceQ] = useState(initialServiceQ);
  const [note, setNote] = useState('');

  const service = services.find(s => s.id === serviceId) ?? null;

  const matches = useMemo(() => {
    const q = fold(query);
    const digits = query.replace(/\D/g, '');
    if ((!q && !digits) || client) return [];
    return clients
      .filter(c => (q && fold(c.full_name).includes(q)) || (digits.length >= 3 && (c.phone ?? '').includes(digits)))
      .slice(0, 5);
  }, [query, clients, client]);

  // free_slots() ya descuenta jornada, citas y bloqueos: no repetimos esa lógica aquí.
  useEffect(() => {
    if (!service || !providerId) { setSlots(null); return; }
    let alive = true;
    setSlots(null);
    void slotsFor(createClient(), providerId, date, service.duration_min).then(s => { if (alive) setSlots(s); });
    return () => { alive = false; };
  }, [service, providerId, date]);

  useEffect(() => {
    if (startMin !== null && slots && !slots.includes(startMin)) setStartMin(null);
  }, [slots, startMin]);

  const who = client?.full_name ?? query.trim();
  const ready = !!service && !!providerId && startMin !== null && who.length > 1 && !pending;

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
        note: note.trim() || undefined,
      });
      if (r.ok) close();
      else setError(r.error ?? 'No se ha podido guardar la cita');
    });
  };

  return (
    <Sheet
      title="Nueva cita"
      subtitle={service ? `${durLbl(service.duration_min)} · ${(service.price_cents / 100).toFixed(0)} €` : 'Elige clienta, servicio y hora'}
      footer={
        <>
          {error && (
            <p className="mb-2.5 rounded-chip bg-danger-bg px-3 py-2 text-label font-semibold text-danger-fg">
              {error}
            </p>
          )}
          <Button size="lg" full onClick={save} disabled={!ready} className="disabled:shadow-none">
            {pending ? 'Guardando…' : 'Guardar cita'}
          </Button>
        </>
      }
    >
      <Field label="Clienta">
        {client ? (
          <div className="flex items-center gap-2.5 rounded-field border border-surface-line bg-v-tint px-3.5 py-3">
            <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-icon text-label font-bold text-white"
              style={{ background: avatarColor(client.full_name) }}
            >
              {client.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body font-bold">{client.full_name}</span>
              {client.phone && <span className="block text-caption font-medium text-ink-2">{client.phone}</span>}
            </span>
            <IconButton
              label="Quitar clienta"
              onClick={() => { setClient(null); setQuery(''); }}
            >
              <X size={16} strokeWidth={2.2} />
            </IconButton>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" strokeWidth={2.2} />
              <input
                className={`${inputCls} pl-9`}
                placeholder="Buscar o escribir un nombre"
                aria-label="Clienta"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            {matches.length > 0 && (
              <div className="mt-1.5 overflow-hidden rounded-field border border-surface-line">
                {matches.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setClient(c)}
                    className="flex w-full items-center gap-2.5 border-b border-surface-line px-3 py-2.5 text-left last:border-0 hover:bg-v-tint"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-bold">{c.full_name}</span>
                      {c.phone && <span className="block text-caption font-medium text-ink-3">{c.phone}</span>}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {query.trim().length > 1 && matches.length === 0 && (
              <p className="mt-1.5 flex items-center gap-1.5 text-caption font-semibold text-ink-2">
                <UserPlus size={14} strokeWidth={2.2} className="text-v" />
                Se guardará como «{query.trim()}», sin ficha
              </p>
            )}
          </>
        )}
      </Field>

      <Field label="Servicio">
        <input
          className={`${inputCls} mb-2`}
          placeholder="Buscar servicio…"
          value={serviceQ}
          onChange={e => setServiceQ(e.target.value)}
          aria-label="Buscar servicio"
        />
        <select
          className={inputCls}
          aria-label="Servicio"
          value={serviceId}
          onChange={e => setServiceId(e.target.value)}
        >
          <option value="">Elegir servicio…</option>
          {Object.entries(CATEGORIES).map(([id, cat]) => {
            const q = fold(serviceQ);
            const list = services.filter(s => s.category === id && (!q || fold(s.name).includes(q)));
            if (!list.length) return null;
            return (
              <optgroup key={id} label={cat.label}>
                {list.map(s => (
                  <option key={s.id} value={s.id}>{s.name} · {durLbl(s.duration_min)}</option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </Field>

      {providers.length > 1 && (
        <Field label="Profesional">
          <div className="flex flex-wrap gap-2">
            {providers.map(p => (
              <Chip key={p.id} active={p.id === providerId} onClick={() => setProviderId(p.id)}>
                {p.full_name.split(' ')[0]}
              </Chip>
            ))}
          </div>
        </Field>
      )}

      <Field label="Día">
        <input
          type="date"
          className={inputCls}
          aria-label="Día"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </Field>

      {service && (
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
      )}

      <Field label="Hora">
        {!service ? (
          <p className="text-label font-semibold text-ink-3">Elige antes el servicio.</p>
        ) : slots === null ? (
          <p className="text-label font-semibold text-ink-3">Buscando huecos…</p>
        ) : slots.length === 0 ? (
          <p className="text-label font-semibold text-ink-2">
            No queda ningún hueco de {durLbl(service.duration_min)} ese día. Prueba el próximo hueco.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {slots.map(m => (
              <Chip key={m} active={m === startMin} onClick={() => setStartMin(m)}>
                <span className="tabular-nums">{fmt(m)}</span>
              </Chip>
            ))}
          </div>
        )}
      </Field>

      <Field label="Nota">
        <input
          className={inputCls}
          placeholder="Opcional: confirmar, viene con…"
          value={note}
          onChange={e => setNote(e.target.value)}
          aria-label="Nota de la cita"
        />
      </Field>
    </Sheet>
  );
}
