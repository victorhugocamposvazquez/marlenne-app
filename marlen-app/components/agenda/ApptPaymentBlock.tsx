'use client';

import { useEffect, useState, useTransition } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { inputCls } from '@/components/Sheet';
import { updateAppointmentPayment } from '@/lib/agenda-write';
import { createClient } from '@/lib/supabase/client';
import {
  PAYMENT_METHODS, centsToEurosInput, eurosInputToCents, owedCents, type PaymentMethod,
} from '@/lib/payment';
import type { AgendaAppt } from '@/lib/types';

function eurosLbl(cents: number) {
  const n = cents / 100;
  return `${n.toFixed(cents % 100 ? 2 : 0)} €`;
}

function methodLabel(id: PaymentMethod | null) {
  return PAYMENT_METHODS.find(m => m.id === id)?.label ?? null;
}

export default function ApptPaymentBlock({
  appt,
  onError,
}: {
  appt: AgendaAppt;
  onError?: (msg: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [paidInput, setPaidInput] = useState(centsToEurosInput(appt.paid_cents));
  const [method, setMethod] = useState<PaymentMethod | null>(appt.payment_method);

  const priceCents = appt.price_cents ?? 0;
  const paidLive = eurosInputToCents(paidInput);
  const dueLive = owedCents(priceCents, paidLive);
  const paidOk = priceCents > 0 ? paidLive >= priceCents : paidLive > 0;
  const methodName = methodLabel(method);

  useEffect(() => {
    setPaidInput(centsToEurosInput(appt.paid_cents));
    setMethod(appt.payment_method);
  }, [appt.id, appt.paid_cents, appt.payment_method]);

  const save = (nextPaid: number, nextMethod: PaymentMethod | null) => {
    if (nextPaid === appt.paid_cents && nextMethod === appt.payment_method) return;
    onError?.(null);
    startTransition(async () => {
      const r = await updateAppointmentPayment(createClient(), appt.id, {
        paidCents: nextPaid,
        paymentMethod: nextMethod,
      });
      if (!r.ok) onError?.(r.error ?? 'No se ha podido guardar el cobro');
    });
  };

  const previstoLbl = appt.client_pack_id
    ? (appt.pack_name ? `Bono · ${appt.pack_name}` : 'Bono')
    : eurosLbl(priceCents);

  const summary = (() => {
    if (paidLive <= 0) return 'Sin cobrar';
    if (paidOk) return methodName ? `Pagado · ${methodName}` : 'Pagado';
    const bits = [eurosLbl(paidLive)];
    if (methodName) bits.push(methodName);
    bits.push(`faltan ${eurosLbl(dueLive)}`);
    return bits.join(' · ');
  })();

  return (
    <div className="overflow-hidden rounded-[14px] border border-surface-line bg-white">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
            paidOk ? 'bg-ok-bg text-ok-strong' : dueLive > 0 && paidLive > 0 ? 'bg-warn-bg text-warn-fg' : 'bg-surface-soft text-ink-3'
          }`}
        >
          {paidOk ? <Check size={16} strokeWidth={2.8} /> : (
            <span className="text-[11px] font-extrabold tabular-nums">€</span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold tracking-[-.01em] text-ink">Cobro</span>
          <span className={`mt-0.5 block truncate text-[13px] font-medium ${
            paidOk ? 'text-ok-strong' : dueLive > 0 && paidLive > 0 ? 'text-warn-fg' : 'text-ink-2'
          }`}>
            {summary}
          </span>
        </span>
        <ChevronDown
          size={18}
          strokeWidth={2.4}
          className={`shrink-0 text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="border-t border-surface-line px-4 pb-4 pt-3.5">
          <div className="mb-3.5 grid grid-cols-2 gap-3">
            <div className="rounded-[12px] bg-surface-soft px-3 py-2.5">
              <p className="text-[11px] font-bold uppercase tracking-[.04em] text-ink-3">Previsto</p>
              <p className="mt-1 text-[17px] font-extrabold tabular-nums tracking-[-.02em] text-ink">
                {previstoLbl}
              </p>
            </div>
            <div className={`rounded-[12px] px-3 py-2.5 ${
              dueLive > 0 ? 'bg-danger-bg' : 'bg-ok-bg'
            }`}>
              <p className={`text-[11px] font-bold uppercase tracking-[.04em] ${
                dueLive > 0 ? 'text-danger-fg/70' : 'text-ok-strong/70'
              }`}>
                {dueLive > 0 ? 'A deber' : 'Estado'}
              </p>
              <p className={`mt-1 text-[17px] font-extrabold tabular-nums tracking-[-.02em] ${
                dueLive > 0 ? 'text-danger-fg' : 'text-ok-strong'
              }`}>
                {dueLive > 0 ? eurosLbl(dueLive) : 'Pagado'}
              </p>
            </div>
          </div>

          <label className="mb-3 block">
            <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.03em] text-ink-2">
              Cobrado
            </span>
            <div className="flex items-stretch gap-2">
              <div className="relative min-w-0 flex-1">
                <input
                  type="text"
                  inputMode="decimal"
                  className={`${inputCls} pr-10`}
                  placeholder="0"
                  value={paidInput}
                  onChange={e => setPaidInput(e.target.value)}
                  onBlur={() => save(eurosInputToCents(paidInput), method)}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-ink-3">
                  €
                </span>
              </div>
              {priceCents > 0 && paidLive < priceCents && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setPaidInput(centsToEurosInput(priceCents));
                    save(priceCents, method);
                  }}
                  className="shrink-0 rounded-field border border-surface-line bg-surface-card px-3.5 text-[13px] font-bold text-v-d disabled:opacity-45"
                >
                  Todo
                </button>
              )}
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.03em] text-ink-2">
              Forma de pago
            </span>
            <div className="relative">
              <select
                className={`${inputCls} appearance-none pr-10`}
                value={method ?? ''}
                disabled={pending}
                onChange={e => {
                  const next = (e.target.value || null) as PaymentMethod | null;
                  setMethod(next);
                  save(eurosInputToCents(paidInput), next);
                }}
              >
                <option value="">Sin indicar</option>
                {PAYMENT_METHODS.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <ChevronDown
                size={16}
                strokeWidth={2.4}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3"
                aria-hidden
              />
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
