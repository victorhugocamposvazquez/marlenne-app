'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { CalendarClock, CalendarPlus, MessageCircle, Phone, Trash2, UserRound } from 'lucide-react';
import Sheet, { Chip, Field, inputCls, useCloseSheet } from '@/components/Sheet';
import NextSlotControls from '@/components/agenda/NextSlotControls';
import { CATEGORIES, STATUS, type StatusId } from '@/lib/categories';
import {
  cancelAppointment, slotsFor, updateAppointmentNote, updateStatus,
} from '@/lib/agenda-write';
import { moveAppointment } from '@/lib/move-appointment';
import { createClient } from '@/lib/supabase/client';
import { dayKey, durLbl, fmt, minutesOfDay, citaCambiada } from '@/lib/time';
import { confirmPageUrl, waConfirmMsg, waHref, waWaiterMsg } from '@/lib/phone';
import { issueAppointmentLink } from '@/lib/confirm-link';
import { shallowSet } from '@/hooks/useShallowQuery';
import type { AgendaAppt, Provider, Waiter } from '@/lib/types';
import { SessionCloseActions, SessionCloseFields, useSessionClose } from './SessionCloseForm';
import { useToast } from '@/components/Toast';

function needsClinicalClose(appt: AgendaAppt) {
  return !!appt.client_id && appt.category !== 'valoracion' && appt.status !== 'done';
}

const SMS_LABEL: Record<string, string> = {
  sent: 'SMS enviado',
  failed: 'SMS fallido',
  queued: 'SMS en cola',
};

export default function AppointmentSheet({
  appt, providers, canMoveProvider, startClosing = false, sms = null,
}: {
  appt: AgendaAppt;
  providers: Provider[];
  canMoveProvider: boolean;
  startClosing?: boolean;
  sms?: { status: string; sent_at: string | null } | null;
}) {
  const close = useCloseSheet();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(startClosing && needsClinicalClose(appt));

  const [moving, setMoving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [waiters, setWaiters] = useState<Waiter[] | null>(null);
  const [date, setDate] = useState(dayKey(appt.starts_at));
  const [providerId, setProviderId] = useState(appt.provider_id);
  const [startMin, setStartMin] = useState<number | null>(null);
  const [slots, setSlots] = useState<number[] | null>(null);
  const [note, setNote] = useState(appt.note ?? '');
  const session = useSessionClose(appt, close);

  const start = minutesOfDay(appt.starts_at);
  const cat = CATEGORIES[appt.category];

  useEffect(() => {
    if (!moving) return;
    let alive = true;
    setSlots(null);
    void slotsFor(createClient(), providerId, date, appt.duration_min, appt.id)
      .then(s => { if (alive) setSlots(s); });
    return () => { alive = false; };
  }, [moving, providerId, date, appt.duration_min, appt.id]);

  const run = (
    fn: () => Promise<{ ok: boolean; error: string | null }>,
    thenClose = false,
    okMsg?: string,
    undo?: () => void,
  ) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? 'No se ha podido guardar');
      else {
        if (okMsg) toast(okMsg, undo ? { undo } : undefined);
        if (thenClose) close();
      }
    });
  };

  const askConfirm = () => {
    setError(null);
    startTransition(async () => {
      const token = await issueAppointmentLink(createClient(), appt.id);
      const url = token ? confirmPageUrl(token) : null;
      const href = waHref(appt.client_phone, waConfirmMsg({
        clientLabel: appt.client_label,
        service: appt.service_name,
        startsAt: appt.starts_at,
        confirmUrl: url,
      }));
      if (href) {
        window.open(href, '_blank', 'noopener,noreferrer');
        return;
      }
      if (url) {
        try {
          await navigator.clipboard.writeText(url);
          toast('Enlace copiado');
        } catch {
          setError(`Pásale este enlace: ${url}`);
        }
      } else {
        setError('No se ha podido crear el enlace. ¿Aplicaste la migración?');
      }
    });
  };

  if (waiters) {
    return (
      <Sheet
        title="Hueco libre"
        subtitle="Hay gente en espera para este servicio"
        footer={
          <button
            type="button"
            onClick={close}
            className="w-full rounded-field border border-surface-line bg-white py-3 text-[14px] font-bold text-ink-2"
          >
            Cerrar
          </button>
        }
      >
        <div className="mb-3 flex flex-col gap-2">
          {waiters.map(w => {
            const wa = w.phone
              ? waHref(w.phone, waWaiterMsg({
                name: w.name,
                service: w.service ?? appt.service_name,
                startsAt: appt.starts_at,
              }))
              : null;
            return (
              <div key={w.id} className="rounded-row border border-surface-line bg-white p-3 shadow-card">
                <div className="truncate text-[14px] font-bold">{w.name}</div>
                <p className="text-[11.5px] font-medium text-ink-3">
                  {[w.service, w.preference].filter(Boolean).join(' · ') || 'Cualquier servicio'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-[12px] bg-emerald-50 px-3 py-2 text-[12px] font-bold text-emerald-800"
                    >
                      <MessageCircle size={14} strokeWidth={2.2} />
                      WhatsApp
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      shallowSet({
                        appt: null,
                        new: '1',
                        client: w.client_id,
                        nombre: w.client_id ? null : w.name,
                        servicio: w.service ?? appt.service_name,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-[12px] border border-surface-line bg-white px-3 py-2 text-[12px] font-bold text-v-d"
                  >
                    <CalendarPlus size={14} strokeWidth={2.2} />
                    Dar cita
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Sheet>
    );
  }

  const moveCita = () => {
    const who = providers.find(p => p.id === providerId)?.full_name.split(' ')[0] ?? null;
    const providerChanged = providerId !== appt.provider_id;
    const prevDate = dayKey(appt.starts_at);
    const prevStart = minutesOfDay(appt.starts_at);
    const prevProvider = appt.provider_id;
    run(
      () => moveAppointment(createClient(), { id: appt.id, date, startMin: startMin!, providerId }),
      true,
      citaCambiada(startMin!, providerChanged ? who : null),
      () => {
        void moveAppointment(createClient(), {
          id: appt.id, date: prevDate, startMin: prevStart, providerId: prevProvider,
        }).then(back => {
          if (!back.ok) toast(back.error ?? 'No se ha podido deshacer', 'err');
        });
      },
    );
  };

  const footer = closing ? (
    <SessionCloseActions
      pending={session.pending}
      error={session.error}
      save={session.save}
      onCancel={() => setClosing(false)}
    />
  ) : moving ? (
    <>
      {error && (
        <p className="mb-2.5 rounded-[12px] bg-pink-50 px-3 py-2 text-[12px] font-semibold text-pink-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMoving(false)}
          className="flex-1 rounded-field border border-surface-line bg-white py-3 text-[13.5px] font-bold text-ink-2"
        >
          Dejarlo
        </button>
        <button
          type="button"
          disabled={startMin === null || pending}
          onClick={moveCita}
          className="flex-1 rounded-field bg-grad py-3 text-[13.5px] font-extrabold text-white shadow-btn disabled:opacity-40 disabled:shadow-none"
        >
          Mover cita
        </button>
      </div>
    </>
  ) : confirmDelete ? (
    <>
      {error && (
        <p className="mb-2.5 rounded-[12px] bg-pink-50 px-3 py-2 text-[12px] font-semibold text-pink-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirmDelete(false)}
          className="flex-1 rounded-field border border-surface-line bg-white py-3 text-[13.5px] font-bold text-ink-2"
        >
          No, dejarla
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const r = await cancelAppointment(createClient(), appt.id);
              if (!r.ok) setError(r.error ?? 'No se ha podido cancelar');
              else if (r.waiters?.length) setWaiters(r.waiters);
              else close();
            });
          }}
          className="flex-1 rounded-field bg-pink-600 py-3 text-[13.5px] font-extrabold text-white disabled:opacity-40"
        >
          Sí, cancelar
        </button>
      </div>
    </>
  ) : (
    <>
      {error && (
        <p className="mb-2.5 rounded-[12px] bg-pink-50 px-3 py-2 text-[12px] font-semibold text-pink-700">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => setConfirmDelete(true)}
        className="flex w-full items-center justify-center gap-2 py-2.5 text-[13.5px] font-bold text-pink-700"
      >
        <Trash2 size={16} strokeWidth={2.2} />
        Cancelar cita
      </button>
    </>
  );

  return (
    <Sheet
      title={appt.client_label}
      subtitle={`${appt.service_name} · ${appt.provider_name}`}
      footer={footer}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-[9px] px-2.5 py-1.5 text-[11px] font-bold" style={{ background: cat.bg, color: cat.fg }}>
          {cat.label}
        </span>
        <span className="rounded-[9px] bg-surface-bg px-2.5 py-1.5 text-[11px] font-bold tabular-nums text-ink-2">
          {fmt(start)} – {fmt(start + appt.duration_min)} · {durLbl(appt.duration_min)}
        </span>
        {appt.price_cents !== null && (
          <span className="rounded-[9px] bg-surface-bg px-2.5 py-1.5 text-[11px] font-bold text-ink-2">
            {(appt.price_cents / 100).toFixed(0)} €
          </span>
        )}
        {appt.session_no !== null && (
          <span className="rounded-[9px] bg-v-soft px-2.5 py-1.5 text-[11px] font-bold text-v-d">
            Sesión {appt.session_no}
          </span>
        )}
        {appt.confirmed_at && (
          <span className="rounded-[9px] bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700">
            Confirmada
          </span>
        )}
        {sms && (
          <span className={`rounded-[9px] px-2.5 py-1.5 text-[11px] font-bold ${
            sms.status === 'sent' ? 'bg-emerald-50 text-emerald-700'
              : sms.status === 'failed' ? 'bg-pink-50 text-pink-700'
              : 'bg-surface-bg text-ink-2'
          }`}
          >
            {SMS_LABEL[sms.status] ?? `SMS ${sms.status}`}
          </span>
        )}
      </div>

      {closing ? (
        <SessionCloseFields
          appt={appt}
          params={session.params}
          setParams={session.setParams}
          measures={session.measures}
          setMeasures={session.setMeasures}
          note={session.note}
          setNote={session.setNote}
          showBody={session.showBody}
        />
      ) : (
        <>
          <Field label="Estado">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(STATUS) as StatusId[]).map(id => (
                <Chip
                  key={id}
                  active={appt.status === id}
                  disabled={pending}
                  onClick={() => {
                    if (id === 'done' && needsClinicalClose(appt)) setClosing(true);
                    else run(() => updateStatus(createClient(), appt.id, id));
                  }}
                >
                  {STATUS[id].label}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Nota">
            <textarea
              className={`${inputCls} min-h-[72px] resize-none`}
              placeholder="Viene con su hija, confirmar por la mañana…"
              value={note}
              onChange={e => setNote(e.target.value)}
              onBlur={() => {
                if (note.trim() === (appt.note ?? '').trim()) return;
                run(() => updateAppointmentNote(createClient(), appt.id, note));
              }}
            />
          </Field>

          {appt.client_id && (
            <Link
              href={`/clientas/${appt.client_id}`}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-field border border-surface-line bg-white py-3 text-[14px] font-bold text-v-d shadow-card"
            >
              <UserRound size={17} strokeWidth={2.2} />
              Ver ficha
            </Link>
          )}
          {appt.client_phone && (
            <a
              href={`tel:${appt.client_phone}`}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-field border border-surface-line bg-white py-3 text-[14px] font-bold text-v-d shadow-card"
            >
              <Phone size={17} strokeWidth={2.2} />
              Llamar {appt.client_phone}
            </a>
          )}
          {appt.status === 'prog' && (
            <button
              type="button"
              disabled={pending}
              onClick={askConfirm}
              className={`mb-3 flex w-full items-center justify-center gap-2 rounded-field py-3 text-[14px] font-bold shadow-card disabled:opacity-40 ${
                appt.client_phone
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border border-surface-line bg-white text-v-d'
              }`}
            >
              <MessageCircle size={17} strokeWidth={2.2} />
              {appt.client_phone ? 'Pedir confirmación' : 'Copiar enlace de confirmación'}
            </button>
          )}

          {!moving ? (
            <button
              type="button"
              onClick={() => { setMoving(true); setStartMin(null); }}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-field border border-surface-line bg-white py-3 text-[14px] font-bold text-v-d shadow-card"
            >
              <CalendarClock size={17} strokeWidth={2.2} />
              Reprogramar
            </button>
          ) : (
            <div className="mb-3 rounded-field border border-surface-line bg-surface-bg/40 p-3.5">
              <NextSlotControls
                durationMin={appt.duration_min}
                providerId={providerId}
                anyProviders={canMoveProvider && providers.length > 1}
                excludeId={appt.id}
                onPick={slot => {
                  setDate(dayKey(slot.startsAt));
                  setProviderId(slot.providerId);
                  setStartMin(minutesOfDay(slot.startsAt));
                }}
              />
              <Field label="Nuevo día">
                <input
                  type="date"
                  className={inputCls}
                  aria-label="Nuevo día"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </Field>

              {canMoveProvider && providers.length > 1 && (
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

              <Field label="Nueva hora">
                {slots === null ? (
                  <p className="text-[12.5px] font-semibold text-ink-3">Buscando huecos…</p>
                ) : slots.length === 0 ? (
                  <p className="text-[12.5px] font-semibold text-ink-2">
                    No queda hueco ese día. Prueba el próximo hueco arriba.
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
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}
