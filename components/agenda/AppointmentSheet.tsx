'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { CalendarClock, Phone, Trash2, UserRound } from 'lucide-react';
import Sheet, { Chip, Field, inputCls, useCloseSheet } from '@/components/Sheet';
import { CATEGORIES, STATUS, type StatusId } from '@/lib/categories';
import {
  cancelAppointment, rescheduleAppointment, slotsFor, updateAppointmentNote, updateStatus,
} from '@/app/actions/appointments';
import { dayKey, durLbl, fmt, minutesOfDay, citaCambiada } from '@/lib/time';
import type { AgendaAppt, Provider } from '@/lib/types';
import SessionCloseForm from './SessionCloseForm';
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
  const [date, setDate] = useState(dayKey(appt.starts_at));
  const [providerId, setProviderId] = useState(appt.provider_id);
  const [startMin, setStartMin] = useState<number | null>(null);
  const [slots, setSlots] = useState<number[] | null>(null);
  const [note, setNote] = useState(appt.note ?? '');

  const start = minutesOfDay(appt.starts_at);
  const cat = CATEGORIES[appt.category];

  // Al reprogramar hay que excluir la propia cita, o su hueco actual no saldría libre.
  useEffect(() => {
    if (!moving) return;
    let alive = true;
    setSlots(null);
    void slotsFor(providerId, date, appt.duration_min, appt.id)
      .then(s => { if (alive) setSlots(s); });
    return () => { alive = false; };
  }, [moving, providerId, date, appt.duration_min, appt.id]);

  const run = (fn: () => Promise<{ ok: boolean; error: string | null }>, thenClose = false, okMsg?: string) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? 'No se ha podido guardar');
      else {
        if (okMsg) toast(okMsg);
        if (thenClose) close();
      }
    });
  };

  return (
    <Sheet
      title={appt.client_label}
      subtitle={`${appt.service_name} · ${appt.provider_name}`}
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
        <SessionCloseForm
          appt={appt}
          onCancel={() => setClosing(false)}
          onDone={close}
        />
      ) : (
      <Field label="Estado">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS) as StatusId[]).map(id => (
            <Chip
              key={id}
              active={appt.status === id}
              disabled={pending}
              onClick={() => {
                if (id === 'done' && needsClinicalClose(appt)) setClosing(true);
                else run(() => updateStatus(appt.id, id));
              }}
            >
              {STATUS[id].label}
            </Chip>
          ))}
        </div>
      </Field>
      )}

      <Field label="Nota">
        <textarea
          className={`${inputCls} min-h-[72px] resize-none`}
          placeholder="Viene con su hija, confirmar por la mañana…"
          value={note}
          onChange={e => setNote(e.target.value)}
          onBlur={() => {
            if (note.trim() === (appt.note ?? '').trim()) return;
            run(() => updateAppointmentNote(appt.id, note));
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

      {!moving ? (
        <button
          onClick={() => { setMoving(true); setStartMin(null); }}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-field border border-surface-line bg-white py-3 text-[14px] font-bold text-v-d shadow-card"
        >
          <CalendarClock size={17} strokeWidth={2.2} />
          Reprogramar
        </button>
      ) : (
        <div className="mb-3 rounded-field border border-surface-line bg-surface-bg/40 p-3.5">
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
              <p className="text-[12.5px] font-semibold text-ink-2">No queda hueco ese día.</p>
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

          <div className="flex gap-2">
            <button
              onClick={() => setMoving(false)}
              className="flex-1 rounded-field border border-surface-line bg-white py-3 text-[13.5px] font-bold text-ink-2"
            >
              Dejarlo
            </button>
            <button
              disabled={startMin === null || pending}
              onClick={() => {
                const who = providers.find(p => p.id === providerId)?.full_name.split(' ')[0] ?? null;
                const providerChanged = providerId !== appt.provider_id;
                run(
                  () => rescheduleAppointment({ id: appt.id, date, startMin: startMin!, providerId }),
                  true,
                  citaCambiada(startMin!, providerChanged ? who : null),
                );
              }}
              className="flex-1 rounded-field bg-grad py-3 text-[13.5px] font-extrabold text-white shadow-btn disabled:opacity-40 disabled:shadow-none"
            >
              Mover cita
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mb-3 rounded-[12px] bg-pink-50 px-3 py-2 text-[12px] font-semibold text-pink-700">
          {error}
        </p>
      )}

      {confirmDelete ? (
        <div className="mb-2 flex gap-2">
          <button
            onClick={() => setConfirmDelete(false)}
            className="flex-1 rounded-field border border-surface-line bg-white py-3 text-[13.5px] font-bold text-ink-2"
          >
            No, dejarla
          </button>
          <button
            disabled={pending}
            onClick={() => run(() => cancelAppointment(appt.id), true)}
            className="flex-1 rounded-field bg-pink-600 py-3 text-[13.5px] font-extrabold text-white disabled:opacity-40"
          >
            Sí, cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="mb-2 flex w-full items-center justify-center gap-2 py-2.5 text-[13.5px] font-bold text-pink-700"
        >
          <Trash2 size={16} strokeWidth={2.2} />
          Cancelar cita
        </button>
      )}
    </Sheet>
  );
}
