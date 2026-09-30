'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Calendar, Check, ChevronLeft, Plus, Search, Ticket, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { circleOutlineCls, pillOutlineCls } from '@/components/ui/IconButton';
import { providerAgendaLabel } from '@/lib/team';
import DayStrip from '@/components/agenda/DayStrip';
import MonthCalendar from '@/components/agenda/MonthCalendar';
import { usePlace } from '@/components/agenda/PlaceContext';
import { useCloseSheet } from '@/components/Sheet';
import SheetShell, { SheetGrab, SheetHandle, useSheetShellClose } from '@/components/SheetShell';
import { avatarColor, catStyle, initials } from '@/lib/categories';
import { loadClientPickerSearch } from '@/app/actions/client-list';
import { syncAppointmentReminderAction } from '@/app/actions/reminder-sync';
import { cancelAppointment, createAppointment, updateAppointment, slotsFor } from '@/lib/agenda-write';
import { createClient } from '@/lib/supabase/client';
import { alignStripStart, DAY_END, dateFromOffset, dayKey, durLbl, fmt, minutesOfDay, offsetFromDay, skipSunday, toTimestamp } from '@/lib/time';
import { filterClientOptions } from '@/lib/client-pick';
import { bestNameMatches, fold, parseClock } from '@/lib/voice';
import { findOpenPackForTemplate, packFitsService, packIsOpen, packLabel, packMatchesSearch, packUsableBy, packsForSection, pickPackForService, templatesForSection, usableOpenPacksForClient } from '@/lib/packs';
import { listClientPacks, sellPack } from '@/lib/pack-write';
import { servicePickSections } from '@/lib/service-pick';
import { readLastServiceId, writeLastServiceId } from '@/hooks/last-service';
import { shallowSet } from '@/hooks/useShallowQuery';
import { useToast } from '@/components/Toast';
import { confirmPageUrl, waConfirmMsg, waHref } from '@/lib/phone';
import { goWhatsApp, reserveWhatsAppWindow } from '@/hooks/open-whatsapp';
import { issueAppointmentLink } from '@/lib/confirm-link';
import ApptPaymentBlock, { type ApptPaymentHandle } from '@/components/agenda/ApptPaymentBlock';
import type { AgendaAppt, ClientOption, ClientPack, PackTemplate, Provider, ServiceOption } from '@/lib/types';
import type { PlacePick } from '@/components/agenda/PlaceContext';

type Step = 'client' | 'service' | 'when' | 'confirm';

export default function NewAppointmentSheet(props: NewAppointmentSheetBodyProps) {
  const closeUrl = useCloseSheet();
  return (
    <SheetShell onClose={closeUrl} initialHeight="tall" grabHeader>
      <NewAppointmentSheetBody {...props} />
    </SheetShell>
  );
}

export type NewAppointmentSheetBodyProps = {
  day: string;
  providers: Provider[];
  services: ServiceOption[];
  clients: ClientOption[];
  packs?: ClientPack[];
  templates?: PackTemplate[];
  serviceCounts?: Record<string, number>;
  preselected?: ClientOption | null;
  initialName?: string;
  initialHora?: string;
  initialServiceQ?: string;
  initialProviderId?: string;
  editing?: AgendaAppt | null;
  showPayment?: boolean;
  onPaymentSaved?: (patch: {
    paid_cents: number;
    payment_method: AgendaAppt['payment_method'];
    payment_split: AgendaAppt['payment_split'];
  }) => void;
};

export function NewAppointmentSheetBody({
  day, providers, services, clients, packs = [], templates = [], serviceCounts = {}, preselected = null,
  initialName = '', initialHora = '', initialServiceQ = '', initialProviderId,
  editing = null, showPayment = true, onPaymentSaved,
}: NewAppointmentSheetBodyProps) {
  const requestClose = useSheetShellClose();
  const toast = useToast();
  const { publish } = usePlace();
  const [pending, startTransition] = useTransition();
  const [payError, setPayError] = useState<string | null>(null);
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
  const [packId, setPackId] = useState(editing?.client_pack_id ?? '');
  const [templateId, setTemplateId] = useState('');
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
  const [wa, setWa] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const payRef = useRef<ApptPaymentHandle>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [fits, setFits] = useState<Record<string, boolean>>({});
  const whenSnap = useRef({ dayOff: 0, startMin: null as number | null, providerId: '' });
  const [clientPool, setClientPool] = useState<ClientOption[]>(clients);

  useEffect(() => { setClientPool(clients); }, [clients]);

  useEffect(() => {
    if (editing?.client_id) {
      const c = clients.find(x => x.id === editing.client_id)
        ?? (editing.client_id
          ? { id: editing.client_id, full_name: editing.client_label, phone: editing.client_phone }
          : null);
      if (c) setClient(prev => (prev?.id === c.id ? prev : c));
      return;
    }
    if (preselected) setClient(prev => (prev?.id === preselected.id ? prev : preselected));
  }, [editing?.client_id, editing?.client_label, editing?.client_phone, preselected, clients]);

  const [clientPacks, setClientPacks] = useState<ClientPack[]>([]);
  useEffect(() => {
    if (!client?.id) {
      setClientPacks([]);
      return;
    }
    let alive = true;
    void listClientPacks(createClient(), client.id).then(rows => {
      if (alive) setClientPacks(rows);
    });
    return () => { alive = false; };
  }, [client?.id]);

  const packsForPick = clientPacks.length ? clientPacks : packs;

  useEffect(() => { setLastId(readLastServiceId()); }, []);

  const clientSearchKey = fold(query);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let alive = true;
    const t = window.setTimeout(() => {
      void loadClientPickerSearch(q).then(rows => {
        if (!alive || !rows.length) return;
        setClientPool(prev => {
          const seen = new Set(prev.map(c => c.id));
          const out = [...prev];
          for (const c of rows) {
            if (!seen.has(c.id)) {
              seen.add(c.id);
              out.push(c);
            }
          }
          return out;
        });
      });
    }, 220);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [clientSearchKey, query]);

  useEffect(() => {
    const q = initialName.trim();
    if (!q || q.length < 2 || client) return;
    void loadClientPickerSearch(q).then(rows => {
      if (!rows.length) return;
      setClientPool(prev => {
        const seen = new Set(prev.map(c => c.id));
        return [...prev, ...rows.filter(c => !seen.has(c.id))];
      });
      const hit = bestNameMatches(rows, q, c => c.full_name)[0];
      if (hit) setClient(hit);
    });
  }, [initialName, client]);

  const service = services.find(s => s.id === serviceId) ?? null;
  const selectedPack = packsForPick.find(p => p.id === packId) ?? null;
  const selectedTemplate = templates.find(t => t.id === templateId) ?? null;
  const who = client?.full_name ?? query.trim();
  const provider = providers.find(p => p.id === providerId);
  const bookDay = dayKey(dateFromOffset(dayOff));
  const ctxDate = dateFromOffset(dayOff).toLocaleDateString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Madrid',
  }).replace('.', '');

  const matches = useMemo(
    () => filterClientOptions(clientPool, query),
    [query, clientPool],
  );

  const clientOpenPacks = useMemo(
    () => (client ? usableOpenPacksForClient(packsForPick, client.id, serviceQ) : []),
    [client, packsForPick, serviceQ],
  );

  const catalog = useMemo(
    () => servicePickSections(services, { lastId, counts: serviceCounts, query: serviceQ }),
    [services, lastId, serviceCounts, serviceQ],
  );

  const sectionsForUi = useMemo(() => {
    const searching = serviceQ.trim().length > 0;
    const matchingTpl = templatesForSection(templates, [], serviceQ, { allMatching: true });
    const generic = templatesForSection(templates, [], serviceQ, { onlyGeneric: true });
    if (catalog.length === 0 && clientOpenPacks.length === 0 && matchingTpl.length === 0) return catalog;
    // Con búsqueda: Bonos agrupa todas las plantillas que coinciden (láser incluido).
    // Sin búsqueda: Bonos solo genéricos; el resto va arriba de su categoría.
    const needBonos = searching ? matchingTpl.length > 0 || clientOpenPacks.length > 0 : generic.length > 0;
    if (catalog.length > 0) {
      return needBonos
        ? [{ key: 'bonos', title: 'Bonos', items: [] as ServiceOption[] }, ...catalog]
        : catalog;
    }
    return [{ key: 'bonos', title: 'Bonos', items: [] as ServiceOption[] }];
  }, [catalog, clientOpenPacks.length, templates, serviceQ]);

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

  const onGridPick = useCallback((p: PlacePick) => {
    setProviderId(p.providerId);
    setStartMin(p.startMin);
    if (backToConfirm || (service && (client || who.length >= 2))) {
      setReturnTo(null);
      setStep('confirm');
      return;
    }
    if (service) setStep('confirm');
    else if (client || who.length >= 2) setStep('service');
  }, [backToConfirm, service, client, who]);

  const [gridStarts, setGridStarts] = useState<Record<string, number[]>>({});
  useEffect(() => {
    if (!service) {
      setGridStarts({});
      return;
    }
    let alive = true;
    const sb = createClient();
    void Promise.all(
      providers.map(async p => {
        const list = await slotsFor(sb, p.id, bookDay, service.duration_min, editing?.id);
        return [p.id, list] as const;
      }),
    ).then(rows => {
      if (alive) setGridStarts(Object.fromEntries(rows));
    });
    return () => { alive = false; };
  }, [service, providers, bookDay, editing?.id]);

  useEffect(() => {
    publish({
      durationMin: service?.duration_min ?? null,
      starts: gridStarts,
      pick: startMin != null && providerId
        ? { providerId, startMin }
        : null,
      clientLabel: who,
      serviceName: service?.name ?? '',
      onPick: onGridPick,
      excludeId: editing?.id ?? null,
    });
    return () => publish(null);
  }, [
    publish, service, gridStarts, startMin, providerId, who, onGridPick, editing?.id,
  ]);

  const pickClient = (c: ClientOption | null, name?: string) => {
    setClient(c);
    setPackId('');
    setTemplateId('');
    if (name && !c) setQuery(name);
    if (backToConfirm) {
      setReturnTo(null);
      setStep('confirm');
      return;
    }
    setServiceId('');
    setStep('service');
  };

  const pickService = (s: ServiceOption, keep?: { packId?: string; templateId?: string }) => {
    if (startMin != null) {
      if (startMin + s.duration_min > DAY_END || fits[s.id] === false) {
        toast('Ese tratamiento no cabe en este hueco', 'err');
        return;
      }
    }
    writeLastServiceId(s.id);
    setServiceId(s.id);
    if (keep) {
      setPackId(keep.packId ?? '');
      setTemplateId(keep.templateId ?? '');
    } else {
      setPackId('');
      setTemplateId('');
    }
    if (backToConfirm || startMin != null) {
      setReturnTo(null);
      setStep('confirm');
      return;
    }
    openWhen('service');
  };

  const pickPack = (p: ClientPack) => {
    setPackId(p.id);
    setTemplateId('');
    if (p.service_id) {
      const s = services.find(x => x.id === p.service_id);
      if (s) {
        pickService(s, { packId: p.id });
        return;
      }
    }
    if (backToConfirm && service) {
      setReturnTo(null);
      setStep('confirm');
    }
  };

  const pickTemplate = (t: PackTemplate) => {
    if (client) {
      const existing = findOpenPackForTemplate(packsForPick, client.id, t);
      if (existing) {
        pickPack(existing);
        return;
      }
    }
    setTemplateId(t.id);
    setPackId('');
    if (t.service_id) {
      const s = services.find(x => x.id === t.service_id);
      if (s) {
        pickService(s, { templateId: t.id });
        return;
      }
    }
    if (backToConfirm && service) {
      setReturnTo(null);
      setStep('confirm');
    }
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
    const tpl = templateId ? templates.find(t => t.id === templateId) ?? null : null;
    const owned = (() => {
      if (!client) return null;
      if (packId) {
        const chosen = packsForPick.find(p => p.id === packId);
        if (
          chosen
          && packUsableBy(chosen, client.id)
          && packFitsService(chosen, service.id)
          && packIsOpen(chosen)
        ) return chosen;
      }
      if (tpl) return findOpenPackForTemplate(packsForPick, client.id, tpl);
      return pickPackForService(
        packsForPick.filter(p => packUsableBy(p, client.id) && packFitsService(p, service.id) && packIsOpen(p)),
        client.id,
        service.id,
      );
    })();
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
      let clientPackId = owned?.id;
      let soldLabel: string | null = owned ? packLabel(owned) : null;

      if (!editing && !clientPackId && tpl) {
        if (!client?.id) {
          waWin?.close();
          toast('Elige clienta para asignar el bono', 'err');
          return;
        }
        const sold = await sellPack(sb, {
          ownerClientId: client.id,
          templateId: tpl.id,
          name: tpl.name,
          serviceId: tpl.service_id ?? service.id,
          sessionsTotal: tpl.sessions_total,
          sessionsDone: 0,
          priceCents: tpl.price_cents,
          validDays: tpl.valid_days,
        });
        if (!sold.ok || !sold.id) {
          waWin?.close();
          toast(sold.error ?? 'No se ha podido asignar el bono', 'err');
          return;
        }
        clientPackId = sold.id;
        soldLabel = `${tpl.name} · ${tpl.sessions_total} ses.`;
      }

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
            clientPackId,
          });
      if (!r.ok) {
        waWin?.close();
        toast(r.error ?? 'No se ha podido guardar', 'err');
        return;
      }
      const apptId = editing?.id ?? r.id;
      if (apptId) void syncAppointmentReminderAction(apptId);
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
      toast('', {
        cita: {
          mode: editing ? 'modified' : 'created',
          client: who,
          date: ctxDate,
          time: service
            ? `${fmt(startMin)}–${fmt(startMin + service.duration_min)}`
            : fmt(startMin),
          treatment: soldLabel
            ? `${service.name} · ${soldLabel}`
            : tpl
              ? `${service.name} · ${tpl.name}`
              : service.name,
        },
      });
      requestClose();
    });
  };

  const remove = () => {
    if (!editing) return;
    startTransition(async () => {
      const r = await cancelAppointment(createClient(), editing.id);
      if (!r.ok) {
        toast(r.error ?? 'No se ha podido borrar', 'err');
        return;
      }
      toast('Cita borrada');
      requestClose();
    });
  };

  const idx = step === 'client' ? 1 : step === 'service' ? 2 : 3;
  const canBack = step !== 'confirm' && (step !== 'client' || returnTo === 'confirm') && !(preselected && step === 'service' && !editing && returnTo !== 'confirm');
  const question = step === 'client'
    ? '¿Para quién es?'
    : step === 'service'
      ? '¿Tratamiento o bono?'
      : step === 'when'
        ? '¿Cuándo?'
        : '¿Algún cambio?';
  const editStep = (next: Step) => {
    if (returnTo === 'confirm' || editing) changeField(next);
    else setStep(next);
  };
  const showTrail = step !== 'client' && step !== 'confirm' && who.length >= 2;
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
    ? `${ctxDate} · ${fmt(startMin)}${provider ? ` · ${providerAgendaLabel(provider)}` : ''}`
    : ctxDate;

  return (
      <div className="flex min-h-0 flex-1 flex-col">
        <SheetGrab className="shrink-0 px-6 pb-2 pt-1">
          <SheetHandle className="mb-3" />
          <div className="flex items-center gap-2.5">
            {canBack && (
              <button type="button" aria-label="Atrás" onClick={goBack} className="grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-track">
                <ChevronLeft size={16} strokeWidth={2.4} />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-label text-ink-2">{editing ? 'Editar cita' : 'Nueva cita'} · paso {idx} de 3</p>
              <p className="truncate text-[15px] font-semibold">{ctx}</p>
            </div>
            <button type="button" aria-label="Cerrar" onClick={() => requestClose()} className="grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-track">
              <X size={16} strokeWidth={2.4} />
            </button>
          </div>
          <div className="mt-3.5 flex gap-1.5">
            {[1, 2, 3].map(n => (
              <span
                key={n}
                className={`h-1 flex-1 rounded-pill ${n <= idx ? (n === 1 ? 'bg-v-2' : 'bg-grad') : 'bg-surface-line'}`}
              />
            ))}
          </div>
        </SheetGrab>
        <h2 className="mx-6 mt-[1.2rem] shrink-0 text-display font-bold tracking-[-.03em]">{question}</h2>
        {showTrail && (
          <div className="mx-6 mt-1.5 shrink-0 text-[14px] leading-snug">
            <button type="button" onClick={() => editStep('client')} className="flex w-full min-w-0 text-left">
              <span className="mr-[3px] shrink-0 text-v">Para:</span>
              <span className="min-w-0 truncate font-semibold text-ink">{who}</span>
            </button>
            {service && step === 'when' && (
              <button type="button" onClick={() => editStep('service')} className="mt-[5px] flex w-full min-w-0 text-left">
                <span className="mr-[3px] shrink-0 text-v">Tratamientos/bonos:</span>
                <span className="min-w-0 truncate font-semibold text-ink">
                  {selectedPack
                    ? `${selectedPack.name} · ${service.name}`
                    : selectedTemplate
                      ? `${selectedTemplate.name} · ${service.name}`
                      : service.name}
                </span>
              </button>
            )}
          </div>
        )}

        {step === 'client' && (
          <>
            <div className="mx-6 mt-3.5 flex h-12 shrink-0 items-center gap-2.5 rounded-field bg-surface-soft px-4">
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
            <div className="mx-6 mt-3.5 flex h-12 shrink-0 items-center gap-2.5 rounded-field bg-surface-soft px-4">
              <Search size={18} className="text-ink-3" strokeWidth={2.2} />
              <input
                value={serviceQ}
                onChange={e => setServiceQ(e.target.value)}
                placeholder="Buscar tratamiento o bono"
                className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-ink-3"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-3">
              {(selectedPack && !selectedPack.service_id) || (selectedTemplate && !selectedTemplate.service_id) ? (
                <p className="mb-3 rounded-row bg-v-tint/60 px-3.5 py-2.5 text-label font-semibold text-v-d">
                  Bono «{selectedPack?.name ?? selectedTemplate?.name}» · elige el tratamiento de esta sesión
                </p>
              ) : null}
              {catalog.length === 0
                && clientOpenPacks.length === 0
                && templates.filter(t => t.is_active !== false && packMatchesSearch(t, serviceQ)).length === 0
                && serviceQ.trim() && (
                <p className="py-4 text-center text-body text-ink-2">
                  No hay tratamiento ni bono con «{serviceQ.trim()}».
                </p>
              )}
              {sectionsForUi.map(sec => {
                const searching = serviceQ.trim().length > 0;
                const isBonosOnly = sec.key === 'bonos' && sec.items.length === 0;
                const sectionPacks = client
                  ? (isBonosOnly
                    ? (searching
                      ? clientOpenPacks
                      : clientOpenPacks.filter(p => !p.service_id))
                    : searching
                      ? []
                      : packsForSection(packsForPick, client.id, sec.items.map(s => s.id), serviceQ))
                  : [];
                const sectionTemplates = isBonosOnly
                  ? templatesForSection(templates, [], serviceQ, searching ? { allMatching: true } : { onlyGeneric: true })
                  : searching
                    ? []
                    : templatesForSection(templates, sec.items.map(s => s.id), serviceQ);
                // No repetir plantilla si la clienta ya tiene ese bono abierto en la sección
                const ownedTplIds = new Set(
                  sectionPacks.map(p => p.template_id).filter(Boolean) as string[],
                );
                const sellable = sectionTemplates.filter(t => !ownedTplIds.has(t.id));
                if (!sectionPacks.length && !sellable.length && !sec.items.length) return null;
                return (
                <div key={sec.key} className="mb-3.5 last:mb-0">
                  <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[.04em] text-ink-3">{sec.title}</p>
                  <div className="flex flex-col gap-2">
                    {sectionPacks.map(p => {
                      const on = packId === p.id;
                      const used = p.sessions_done;
                      const left = p.remaining;
                      return (
                        <button
                          key={`pack-${p.id}`}
                          type="button"
                          onClick={() => pickPack(p)}
                          className="flex w-full items-center gap-3.5 rounded-row px-4 py-2.5 text-left"
                          style={{
                            background: on ? '#fff' : 'rgb(var(--c-soft))',
                            boxShadow: on ? 'inset 0 0 0 2px rgb(var(--c-brand-2))' : undefined,
                          }}
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-v-tint text-v-d">
                            <Ticket size={16} strokeWidth={2.4} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-body-lg font-semibold">{p.name}</span>
                            <span className="block text-label text-ink-2">
                              Su bono · usadas {used} · quedan {left}
                            </span>
                          </span>
                          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${
                            on ? 'border-v bg-v-tint' : 'border-v/40 bg-white'
                          }`}>
                            {on ? <Check size={14} strokeWidth={3} className="text-v-d" /> : null}
                          </span>
                          <span className="shrink-0 text-[13px] font-bold tabular-nums text-v-d">
                            {left}/{p.sessions_total}
                          </span>
                        </button>
                      );
                    })}
                    {sellable.map(t => {
                      const on = templateId === t.id && !packId;
                      const euros = t.price_cents > 0 ? `${(t.price_cents / 100).toFixed(0)} €` : 'sin precio';
                      return (
                        <button
                          key={`tpl-${t.id}`}
                          type="button"
                          onClick={() => pickTemplate(t)}
                          className="flex w-full items-center gap-3.5 rounded-row px-4 py-2.5 text-left"
                          style={{
                            background: on ? '#fff' : 'rgb(var(--c-soft))',
                            boxShadow: on ? 'inset 0 0 0 2px rgb(var(--c-brand-2))' : undefined,
                          }}
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-v-tint text-v-d">
                            <Ticket size={16} strokeWidth={2.4} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-body-lg font-semibold">{t.name}</span>
                            <span className="block text-label text-ink-2">
                              Bono · {t.sessions_total} ses. · {euros}
                              {client ? ' · asignar a esta cita' : ' · elige clienta para asignarlo'}
                            </span>
                          </span>
                          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${
                            on ? 'border-v bg-v-tint' : 'border-v/40 bg-white'
                          }`}>
                            {on ? <Check size={14} strokeWidth={3} className="text-v-d" /> : null}
                          </span>
                        </button>
                      );
                    })}
                    {sec.items.map(s => {
                      const cat = catStyle(s.category, { color: s.category_color });
                      const ok = startMin == null || fits[s.id] !== false;
                      const end = startMin != null ? fmt(startMin + s.duration_min) : null;
                      const habitual = lastId === s.id;
                      const first = client?.full_name.split(' ')[0];
                      const svcOn = !packId && !templateId && serviceId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => pickService(s)}
                          className="flex w-full items-center gap-3.5 rounded-row px-4 py-2.5 text-left"
                          style={{
                            background: svcOn || habitual ? '#fff' : 'rgb(var(--c-soft))',
                            boxShadow: svcOn || habitual ? 'inset 0 0 0 1.5px rgb(var(--c-ink))' : undefined,
                            opacity: ok ? 1 : 0.45,
                          }}
                        >
                          <span className="h-9 w-2 shrink-0 rounded-pill" style={{ background: cat.color }} />
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
                );
              })}
            </div>
          </>
        )}

        {step === 'when' && (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-[1.2rem]">
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
                className={`${circleOutlineCls} h-12 w-12`}
                aria-label="Calendario"
              >
                <Calendar size={24} strokeWidth={2} />
              </button>
            </div>
            {providers.length > 1 && (
              <div
                className="-mx-6 mb-4 overflow-x-auto px-6 pb-2 [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-ink-3 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-surface-line"
              >
                <div className="flex w-max min-w-full snap-x snap-mandatory gap-2.5">
                  {providers.map(p => {
                    const on = p.id === providerId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setProviderId(p.id); setStartMin(null); }}
                        className={`inline-flex h-[38px] shrink-0 snap-start items-center justify-center whitespace-nowrap rounded-pill px-4 text-label transition motion-safe:active:scale-[.97] ${
                          on
                            ? 'bg-[rgb(var(--c-brand-2))] font-extrabold text-white'
                            : `${pillOutlineCls} font-semibold text-ink-2`
                        }`}
                      >
                        {providerAgendaLabel(p)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <p className="mb-3 text-label font-semibold text-ink-2">
              Horas disponibles{provider ? `: ${providerAgendaLabel(provider)}` : ''}
            </p>
            {hours == null && <p className="py-6 text-body text-ink-2">Buscando huecos…</p>}
            {hours && hours.length === 0 && (
              <p className="rounded-row bg-surface-soft px-4 py-5 text-body text-ink-2">
                No hay huecos este día{service ? ` para ${durLbl(service.duration_min)}` : ''}. Prueba otro.
              </p>
            )}
            {hours && hours.length > 0 && (
              <div className="grid grid-cols-4 gap-2.5">
                {hours.map(min => {
                  const on = startMin === min;
                  return (
                    <button
                      key={min}
                      type="button"
                      onClick={() => pickHour(min)}
                      className="h-[50px] rounded-row text-[16px] font-semibold tabular-nums"
                      style={{
                        background: on ? 'rgb(var(--c-brand-2))' : 'rgb(var(--c-soft))',
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
                <Row
                  label="Tratamientos/bonos"
                  value={
                    service
                      ? selectedPack
                        ? `${selectedPack.name} · ${service.name} · sesión ${selectedPack.sessions_done + 1}/${selectedPack.sessions_total}`
                        : selectedTemplate
                          ? `${selectedTemplate.name} · ${service.name} · ${selectedTemplate.sessions_total} ses. (asignar)`
                          : `${service.name} · ${durLbl(service.duration_min)}`
                      : '—'
                  }
                  onChange={() => changeField('service')}
                />
                <Row
                  label="Cuándo"
                  value={startMin != null && service ? `${ctxDate}, ${fmt(startMin)}–${fmt(startMin + service.duration_min)}` : ctxDate}
                  hint={provider ? `Con ${providerAgendaLabel(provider)}` : undefined}
                  onChange={() => openWhen('confirm')}
                  last
                />
              </div>
              {editing && showPayment && (
                <div className="mt-4">
                  <ApptPaymentBlock
                    ref={payRef}
                    appt={editing}
                    onError={setPayError}
                    onSaved={onPaymentSaved}
                    onOpenChange={setPayOpen}
                  />
                  {payError && (
                    <p className="mt-2 text-label font-semibold text-danger-fg">{payError}</p>
                  )}
                </div>
              )}
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
            <div className="flex flex-col gap-2 px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
              {editing && askDelete ? (
                <>
                  <p className="text-center text-[15px] font-semibold">¿Borrar esta cita?</p>
                  <div className="flex gap-2">
                    <Button variant="secondary" className="flex-1" disabled={pending} onClick={() => setAskDelete(false)}>
                      No, dejarla
                    </Button>
                    <Button variant="danger" className="flex-1" disabled={pending} onClick={remove}>
                      {pending ? 'Borrando…' : 'Sí, borrar'}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    full
                    onClick={() => {
                      if (payOpen) {
                        payRef.current?.flush();
                        payRef.current?.close();
                        return;
                      }
                      save();
                    }}
                    disabled={pending || !service || startMin == null}
                  >
                    <Check size={20} strokeWidth={2.8} />
                    {pending
                      ? 'Guardando…'
                      : payOpen
                        ? 'Guardar pago'
                        : editing
                          ? 'Guardar cambios'
                          : 'Guardar cita'}
                  </Button>
                  {editing && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setAskDelete(true)}
                      className="min-h-[44px] text-[15px] font-bold text-danger-fg disabled:opacity-45"
                    >
                      Borrar cita
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
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
