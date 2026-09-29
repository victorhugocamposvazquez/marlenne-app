'use client';

import { useEffect, useState, useTransition } from 'react';
import { Chip, inputCls } from '@/components/Sheet';
import { updateAppointmentPayment } from '@/lib/agenda-write';
import { createClient } from '@/lib/supabase/client';
import {
  PAYMENT_METHODS, centsToEurosInput, eurosInputToCents, owedCents, type PaymentMethod,
} from '@/lib/payment';
import type { AgendaAppt } from '@/lib/types';

export default function ApptPaymentBlock({
  appt,
  onError,
}: {
  appt: AgendaAppt;
  onError?: (msg: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [paidInput, setPaidInput] = useState(centsToEurosInput(appt.paid_cents));
  const [method, setMethod] = useState<PaymentMethod | null>(appt.payment_method);

  const priceCents = appt.price_cents ?? 0;
  const paidLive = eurosInputToCents(paidInput);
  const dueLive = owedCents(priceCents, paidLive);

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

  return (
    <div className="rounded-field border border-surface-line bg-surface-soft/60 p-3.5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <div className="text-caption font-bold uppercase tracking-[.03em] text-ink-3">Previsto</div>
          <div className="mt-0.5 text-body font-extrabold tabular-nums text-ink">
            {appt.client_pack_id
              ? (appt.pack_name ? `Bono · ${appt.pack_name}` : 'Bono')
              : `${(priceCents / 100).toFixed(priceCents % 100 ? 2 : 0)} €`}
          </div>
        </div>
        <div className="text-right">
          <div className="text-caption font-bold uppercase tracking-[.03em] text-ink-3">
            {dueLive > 0 ? 'A deber' : 'Estado'}
          </div>
          <div className={`mt-0.5 text-body font-extrabold tabular-nums ${dueLive > 0 ? 'text-danger-fg' : 'text-ok-strong'}`}>
            {dueLive > 0 ? `${(dueLive / 100).toFixed(dueLive % 100 ? 2 : 0)} €` : 'Pagado'}
          </div>
        </div>
      </div>

      <label className="mb-3 block">
        <span className="mb-1 block text-caption font-bold uppercase tracking-[.03em] text-ink-2">
          Cobrado (€)
        </span>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="decimal"
            className={inputCls}
            placeholder="0"
            value={paidInput}
            onChange={e => setPaidInput(e.target.value)}
            onBlur={() => save(eurosInputToCents(paidInput), method)}
          />
          {priceCents > 0 && paidLive < priceCents && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setPaidInput(centsToEurosInput(priceCents));
                save(priceCents, method);
              }}
              className="shrink-0 rounded-chip border border-surface-line bg-surface-card px-3 text-label font-bold text-v-d"
            >
              Cobrar todo
            </button>
          )}
        </div>
      </label>

      <div className="flex flex-wrap gap-2">
        {PAYMENT_METHODS.map(m => (
          <Chip
            key={m.id}
            active={method === m.id}
            disabled={pending}
            onClick={() => {
              const next = method === m.id ? null : m.id;
              setMethod(next);
              save(eurosInputToCents(paidInput), next);
            }}
          >
            {m.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}
