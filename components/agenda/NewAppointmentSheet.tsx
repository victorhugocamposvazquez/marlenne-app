'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Check, ChevronLeft, Plus, Search, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import DayStrip from '@/components/agenda/DayStrip';
import MonthCalendar from '@/components/agenda/MonthCalendar';
import { useCloseSheet } from '@/components/Sheet';
import { avatarColor, catStyle, initials } from '@/lib/categories';
import { createAppointment, updateAppointment, slotsFor } from '@/lib/agenda-write';
import { createClient } from '@/lib/supabase/client';
import { alignStripStart, DAY_END, dateFromOffset, dayKey, durLbl, fmt, minutesOfDay, offsetFromDay, skipSunday, toTimestamp } from '@/lib/time';
import { filterClientOptions } from '@/lib/client-pick';
import { bestNameMatches, fold, parseClock } from '@/lib/voice';
import { packFitsService, packIsOpen, packUsableBy, pickPackForService } from '@/lib/packs';
import { servicePickSections } from '@/lib/service-pick';
import { readLastServiceId, writeLastServiceId } from '@/hooks/last-service';
import { shallowSet } from '@/hooks/useShallowQuery';
import { useToast } from '@/components/Toast';
import { confirmPageUrl, firstName, waConfirmMsg, waHref } from '@/lib/phone';
import { goWhatsApp, reserveWhatsAppWindow } from '@/hooks/open-whatsapp';
import { issueAppointmentLink } from '@/lib/confirm-link';
import type { AgendaAppt, ClientOption, ClientPack, Provider, ServiceOption } from '@/lib/types';

type Step = 'client' | 'service' | 'when' | 'confirm';

export default function NewAppointmentSheet({
  day, providers, services, clients, packs = [], serviceCounts = {}, preselected = null,
  initialName = '', initialHora = '', initialServiceQ = '', initialProviderId,
  editing = null,
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
  editing?: AgendaAppt | null;
}) {
  const closeAll = useCloseSheet();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const guessed = initialServiceQ ? bestNameMatches(services, initialServiceQ, s => s.name) : [];
  const editClient = editing
    ? (clients.find(c => c.id === editing.client_id) ?? (editing.client_id
      ? { id: editing.client_id, full_name: editing.client_label, phone: editing.client_phone }
      : null))
    : preselected;
  const [query, setQuery] = useState(editClient ? '' : (editing?.client_label ?? initialName));
  const [serviceQ, setServiceQ] = useState(guessed.length === 1 || editing ? '' : initialServiceQ);
  const [client, setClient] = useState<ClientOption | null>(editClient);
  const [serviceId, setServiceId] = useState(
    editing?.service_id ?? (guessed.length === 1 ? guessed[0].id : ''),
  );
  const [providerId, setProviderId] = useState(
    editing?.provider_id
    ?? (initialProviderId && providers.some(p => p.id === initialProviderId)
      ? initialProviderId
      : (providers[0]?.id ?? '')),
  );
  const [startMin, setStartMin] = useState<number | null>(
    editing ? minutesOfDay(editing.starts_at) : parseClock(initialHora),
  );
  const [dayOff, setDayOff] = useState(() => skipSunday(offsetFromDay(editing?.starts_at ?? day), 1));
  const [stripStart, setStripStart] = useState(() => {
    const off = skipSunday(offsetFromDay(editing?.starts_at ?? day), 1);
    return alignStripStart(off, off, 5);
  });
  const [step, setStep] = useState<Step>(() => {
    if (editing) return 'confirm';
    if (preselected && guessed.length === 1 && parseClock(initialHora) != null) return 'confirm';
    if (preselected) return 'service';
    return 'client';
  });
  const [whenFrom, setWhenFrom] = useState<Step>('service');
  const [returnTo, setReturnTo] = useState<Step | null>(null);
  const [cal, setCal] = useState(false);
  const [hours, setHours] = useState<number[] | null>(null);
  const [wa, setWa] = useState(true);
  const [lastId, setLastId] = useState<string | null>(null);
  const [fits, setFits] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const whenSnap = useRef({ dayOff: 0, startMin: null as number | null, providerId: '' });

  useEffect(() => { setMounted(true); setLastId(readLastServiceId()); }, []);

  const service = services.find(s => s.id === serviceId) ?? null;
  const who = client?.full_name ?? query.trim();
  const provider = providers.find(p => p.id === providerId);
  const bookDay = dayKey(dateFromOffset(dayOff));
  const ctxDate = dateFromOffset(dayOff).toLocaleDateString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Madrid',
  }).replace('.', '');

  const matches = useMemo(
    () => filterClientOptions(clients, query),
    [query, clients],
  );

  const catalog = useMemo(
    () => servicePickSections(services, { lastId, counts: serviceCounts, query: serviceQ }),
    [services, lastId, serviceCounts, serviceQ],
  );

  useEffect(() => {
    if (step !== 'service' || startMin == null || !providerId) { setFits({}); return; }
    let alive = true;
    void Promise.all(services.map(async s => {
      const slots = await slotsFor(createClient(), providerId, bookDay, s.duration_min, editing?.id);
      return [s.id, slots.includes(startMin)] as const;
    })).then(rows => {
      if (!alive) return;
      setFits(Object.fromEntries(rows));
    });
    return () => { alive = false; };
  }, [step, startMin, providerId, bookDay, services, editing?.id]);

  useEffect(() => {
    if (step !== 'when' || !service || !providerId) { setHours(null); return; }
    let alive = true;
    setHours(null);
    void slotsFor(createClient(), providerId, bookDay, service.duration_min, editing?.id).then(list => {
      if (alive) setHours(list);
    });
    return () => { alive = false; };
  }, [step, service, providerId, bookDay, editing?.id]);

  const backToConfirm = returnTo === 'confirm' || !!editing;

  const pickClient = (c: ClientOption | null, name?: string) => {
    setClient(c);
    if (name && !c) setQuery(name);
    if (backToConfirm) {
      setReturnTo(null);
      setStep('confirm');
      return;
    }
    setServiceId('');
    setStep('service');
  };

  const pickService = (s: ServiceOption) => {
    if (startMin != null) {
      if (startMin + s.duration_min > DAY_END || fits[s.id] === false) {
        toast('Ese tratamiento no cabe en este hueco', 'err');
        return;
      }
    }
    writeLastServiceId(s.id);
    setServiceId(s.id);
    if (backToConfirm || startMin != null) {
      setReturnTo(null);
      setStep('confirm');
      return;
    }
    openWhen('service');
  };

  const changeField = (next: Step) => {
    setReturnTo('confirm');
    setStep(next);
  };

  const openWhen = (from: Step) => {
    whenSnap.current = { dayOff, startMin, providerId };
    setWhenFrom(from);
    setStep('when');
  };

  const pickDay = (offset: number, extra?: { strip?: number }) => {
    const next = skipSunday(offset, 1);
    setDayOff(next);
    setStripStart(alignStripStart(next, extra?.strip ?? stripStart, 5));
    setStartMin(null);
  };

  const pickHour = (min: number) => {
    setStartMin(min);
    setStep('confirm');
  };

  const save = () => {
    if (!service || startMin == null || who.length < 2) return;
    const pack = client
      ? pickPackForService(packs.filter(p => packUsableBy(p, client.id) && packFitsService(p, service.id) && packIsOpen(p)), client.id, service.id)
      : null;
    const draftHref = wa
      ? waHref(client?.phone, waConfirmMsg({
          clientLabel: who,
          service: service.name,
          startsAt: toTimestamp(bookDay, startMin),
        }))
      : null;
    if (wa && !draftHref) {
      toast('Esta clienta no tiene un teléfono válido para WhatsApp', 'err');
    }
    const waWin = draftHref ? reserveWhatsAppWindow() : null;
    startTransition(async () => {
      const sb = createClient();
      const r = editing
        ? await updateAppointment(sb, {
            id: editing.id,
            clientId: client?.id,
            clientName: client ? undefined : who,
            serviceId: service.id,
            providerId,
            date: bookDay,
            startMin,
          })
        : await createAppointment(sb, {
            clientId: client?.id,
            clientName: client ? undefined : who,
            serviceId: service.id,
            providerId,
            date: bookDay,
            startMin,
            clientPackId: pack?.id,
          });
      if (!r.ok) {
        waWin?.close();
        toast(r.error ?? 'No se ha podido guardar', 'err');
        return;
      }
      const savedId = editing?.id ?? r.id;
      if (draftHref && savedId) {
        const token = await issueAppointmentLink(sb, savedId);
        const href = waHref(client?.phone, waConfirmMsg({
          clientLabel: who,
          service: service.name,
          startsAt: toTimestamp(bookDay, startMin),
          confirmUrl: token ? confirmPageUrl(token) : null,
        })) ?? draftHref;
        goWhatsApp(href, waWin);
      }
      toast(editing
        ? `Cita actualizada · ${who.split(' ')[0]} ${fmt(startMin)}`
        : `Cita guardada · ${who.split(' ')[0]} ${fmt(startMin)}${draftHref ? ' · WhatsApp' : ''}`);
      closeAll();
      shallowSet({ new: null, appt: null, client: null, nombre: null, hora: null, servicio: null, con: null });
    });
  };

  const idx = step === 'client' ? 1 : step === 'service' ? 2 : 3;
  const canBack = step !== 'confirm' && (step !== 'client' || returnTo === 'confirm') && !(preselected && step === 'service' && !editing && returnTo !== 'confirm');
  const first = who.length >= 2 ? firstName(who) : '';
  const question = step === 'client'
    ? '¿Para quién es?'
    : step === 'service'
      ? (first ? `¿Qué tratamiento para ${first}?` : '¿Qué tratamiento?')
      : step === 'when'
        ? (first && service
          ? `¿Cuándo le hacemos ${service.name} a ${first}?`
          : first ? `¿Cuándo para ${first}?` : '¿Cuándo?')
        : '¿Algún cambio?';
  const goBack = () => {
    if (returnTo === 'confirm' && (step === 'client' || step === 'service')) {
      setReturnTo(null);
      setStep('confirm');
      return;
    }
    if (step === 'when') {
      setDayOff(whenSnap.current.dayOff);
      setStartMin(whenSnap.current.startMin);
      setProviderId(whenSnap.current.providerId);
      setStep(whenFrom);
      return;
    }
    if (step === 'confirm') setStep('service');
    else setStep('client');
  };
  const ctx = startMin != null
    ? `${ctxDate} · ${fmt(startMin)}${provider ? ` · ${provider.full_name.split(' ')[0]}` : ''}`
    : ctxDate;

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-[rgba(15,14,26,.35)]" onClick={closeAll} />
      <div className="relative z-10 flex h-[88%] w-full max-w-[440px] flex-col rounded-t-sheet bg-white shadow-[0_-20px_60px_rgba(15,14,26,.18)]">
        <div className="flex justify-center pt-3"><div className="h-[5px] w-10 rounded-full bg-handle" /></div>
        <div className="flex items-center gap-2.5 px-6 pt-3.5">
          {canBack && (
            <button type="button" aria-label="Atrás" onClick={goBack} className="grid h-10 w-10 place-items-center rounded-pill bg-track">
              <ChevronLeft size={16} strokeWidth={2.4} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-label text-ink-2">{editing ? 'Editar cita' : 'Nueva cita'} · paso {idx} de 3</p>
            <p className="truncate text-[15px] font-semibold">{ctx}</p>
          </div>
          <button type="button" aria-label="Cerrar" onClick={closeAll} className="grid h-10 w-10 place-items-center rounded-pill bg-track">
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>
        <div className="mx-6 mt-3.5 flex gap-1.5">
          {[1, 2, 3].map(n => (
            <span
              key={n}
              className={`h-1 flex-1 rounded-pill ${n <= idx ? (n === 1 ? 'bg-v-2' : 'bg-grad') : 'bg-surface-line'}`}
            />
          ))}
        </div>
        <h2 className="mx-6 mt-6 shrink-0 text-display font-bold tracking-[-.03em]">{question}</h2>

        {step === 'client' && (
          <>
            <div className="mx-6 mt-4 flex h-14 shrink-0 items-center gap-2.5 rounded-field bg-surface-soft px-4">
              <Search size={18} className="text-ink-3" strokeWidth={2.2} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={query.trim() ? 'Nombre o teléfono' : `${clients.length} en la agenda`}
                className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-ink-3"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-3">
              {matches.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pickClient(c)}
                  className="flex w-full items-center gap-3 border-b border-surface-line py-3.5 text-left"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white" style={{ background: avatarColor(c.full_name) }}>
                    {initials(c.full_name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-lg font-semibold">{c.full_name}</span>
                    {c.phone && <span className="block truncate text-label text-ink-2">{c.phone}</span>}
                  </span>
                </button>
              ))}
              {query.trim().length > 1 && !matches.some(c => fold(c.full_name) === fold(query)) && (
                <button type="button" onClick={() => pickClient(null, query.trim())} className="flex w-full items-center gap-3 py-3.5 text-left">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-track">
                    <Plus size={18} strokeWidth={2.4} />
                  </span>
                  <span className="text-body-lg font-semibold">Nueva clienta: «{query.trim()}»</span>
                </button>
              )}
            </div>
          </>
        )}

        {step === 'service' && (
          <>
            <div className="mx-6 mt-4 flex h-14 shrink-0 items-center gap-2.5 rounded-field bg-surface-soft px-4">
              <Search size={18} className="text-ink-3" strokeWidth={2.2} />
              <input
                value={serviceQ}
                onChange={e => setServiceQ(e.target.value)}
                placeholder="Buscar tratamiento"
                className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-ink-3"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-4">
              {catalog.map(sec => (
                <div key={sec.key} className="mb-4 last:mb-0">
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-[.04em] text-ink-3">{sec.title}</p>
                  <div className="flex flex-col gap-2.5">
                    {sec.items.map(s => {
                      const cat = catStyle(s.category, { color: s.category_color });
                      const ok = startMin == null || fits[s.id] !== false;
                      const end = startMin != null ? fmt(startMin + s.duration_min) : null;
                      const habitual = lastId === s.id;
                      const first = client?.full_name.split(' ')[0];
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => pickService(s)}
                          className="flex w-full items-center gap-3.5 rounded-row px-4 py-3.5 text-left"
                          style={{
                            background: habitual ? '#fff' : 'rgb(var(--c-soft))',
                            boxShadow: habitual ? 'inset 0 0 0 1.5px rgb(var(--c-ink))' : undefined,
                            opacity: ok ? 1 : 0.45,
                          }}
                        >
                          <span className="h-10 w-2 shrink-0 rounded-pill" style={{ background: cat.color }} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-body-lg font-semibold">{s.name}</span>
                            <span className={`block text-label ${ok ? (habitual ? 'text-v-d' : 'text-ink-2') : 'text-danger-fg'}`}>
                              {!ok
                                ? `No cabe: hay cita antes de ${end}`
                                : habitual && first
                                  ? `Lo habitual de ${first}`
                                  : (end ? `Hasta las ${end}` : durLbl(s.duration_min))}
                            </span>
                          </span>
                          <span className="shrink-0 text-[14px] font-semibold text-ink-2">{durLbl(s.duration_min)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 'when' && (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-2">
            <div className="mb-6 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <DayStrip
                  selectedOffset={dayOff}
                  startOffset={alignStripStart(dayOff, stripStart, 5)}
                  onSelect={offset => pickDay(offset)}
                />
              </div>
              <button
                type="button"
                onClick={() => setCal(true)}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-pill bg-ink text-white"
                aria-label="Calendario"
              >
                <Calendar size={24} strokeWidth={2.2} />
              </button>
            </div>
            {providers.length > 1 && (
              <div className="mb-6 flex flex-wrap gap-2.5">
                {providers.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setProviderId(p.id); setStartMin(null); }}
                    className="rounded-pill px-4 py-2.5 text-label font-semibold"
                    style={{
                      background: p.id === providerId ? 'rgb(var(--c-ink))' : 'rgb(var(--c-soft))',
                      color: p.id === providerId ? '#fff' : 'rgb(var(--c-ink))',
                    }}
                  >
                    {p.full_name.split(' ')[0]}
                  </button>
                ))}
              </div>
            )}
            <p className="mb-3 text-label font-semibold text-ink-2">Hora</p>
            {hours == null && <p className="py-6 text-body text-ink-2">Buscando huecos…</p>}
            {hours && hours.length === 0 && (
              <p className="rounded-row bg-surface-soft px-4 py-5 text-body text-ink-2">
                No hay huecos este día{service ? ` para ${durLbl(service.duration_min)}` : ''}. Prueba otro.
              </p>
            )}
            {hours && hours.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5">
                {hours.map(min => {
                  const on = startMin === min;
                  return (
                    <button
                      key={min}
                      type="button"
                      onClick={() => pickHour(min)}
                      className="h-[50px] rounded-row text-[16px] font-semibold tabular-nums"
                      style={{
                        background: on ? 'var(--grad)' : 'rgb(var(--c-soft))',
                        color: on ? '#fff' : 'rgb(var(--c-ink))',
                      }}
                    >
                      {fmt(min)}
                    </button>
                  );
                })}
              </div>
            )}
            {cal && (
              <MonthCalendar
                selectedOffset={dayOff}
                onClose={() => setCal(false)}
                onSelect={offset => pickDay(offset, { strip: offset })}
              />
            )}
          </div>
        )}

        {step === 'confirm' && (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4">
              <div className="rounded-card bg-surface-soft px-[18px]">
                <Row label="Clienta" value={who} onChange={() => changeField('client')} />
                <Row label="Tratamiento" value={service ? `${service.name} · ${durLbl(service.duration_min)}` : '—'} onChange={() => changeField('service')} />
                <Row
                  label="Cuándo"
                  value={startMin != null && service ? `${ctxDate}, ${fmt(startMin)}–${fmt(startMin + service.duration_min)}` : ctxDate}
                  hint={provider ? `Con ${provider.full_name.split(' ')[0]}` : undefined}
                  onChange={() => openWhen('confirm')}
                  last
                />
              </div>
              {waHref(client?.phone) ? (
                <button type="button" onClick={() => setWa(v => !v)} className="mt-4 flex items-center gap-3 px-1">
                  <span
                    className="grid h-[26px] w-[26px] place-items-center rounded-[8px]"
                    style={{
                      background: wa ? 'rgb(var(--c-ink))' : '#fff',
                      boxShadow: wa ? undefined : 'inset 0 0 0 1.5px #C4C2CF',
                    }}
                  >
                    {wa && <Check size={14} strokeWidth={3} className="text-white" />}
                  </span>
                  <span className="text-[15px] font-semibold">Enviar confirmación por WhatsApp</span>
                </button>
              ) : (
                <p className="mt-4 text-label text-ink-2">Sin teléfono en la ficha: no se puede abrir WhatsApp.</p>
              )}
            </div>
            <div className="px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
              <Button size="lg" full onClick={save} disabled={pending || !service || startMin == null}>
                <Check size={20} strokeWidth={2.8} />
                {pending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar cita'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Row({
  label, value, hint, onChange, last,
}: {
  label: string;
  value: string;
  hint?: string;
  onChange: () => void;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 py-3.5 ${last ? '' : 'border-b border-[#E6E5EC]'}`}>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-v">{label}</p>
        <p className="text-body-lg font-semibold">{value}</p>
        {hint && <p className="text-label text-ink-2">{hint}</p>}
      </div>
      <button type="button" onClick={onChange} className="text-[14px] font-bold text-v-2">Cambiar</button>
    </div>
  );
}
