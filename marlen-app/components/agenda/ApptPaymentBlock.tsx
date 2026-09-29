'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, X } from 'lucide-react';
import { inputCls } from '@/components/Sheet';
import { updateAppointmentPayment } from '@/lib/agenda-write';
import { createClient } from '@/lib/supabase/client';
import {
  PAYMENT_METHODS,
  SPLIT_METHODS,
  centsToEurosInput,
  eurosInputToCents,
  owedCents,
  splitSummary,
  sumSplit,
  type PaymentMethod,
  type PaymentSplit,
  type SplitMethod,
} from '@/lib/payment';
import type { AgendaAppt } from '@/lib/types';

function eurosLbl(cents: number) {
  const n = cents / 100;
  return `${n.toFixed(cents % 100 ? 2 : 0)} €`;
}

function methodLabel(id: PaymentMethod | null) {
  return PAYMENT_METHODS.find(m => m.id === id)?.label ?? null;
}

function emptySplitInputs(): Record<SplitMethod, string> {
  return { cash: '', card: '', bizum: '' };
}

function splitToInputs(split: PaymentSplit | null): Record<SplitMethod, string> {
  const out = emptySplitInputs();
  if (!split) return out;
  for (const m of SPLIT_METHODS) {
    out[m.id] = centsToEurosInput(split[m.id] ?? 0);
  }
  return out;
}

function inputsToSplit(inputs: Record<SplitMethod, string>): PaymentSplit {
  const out: PaymentSplit = {};
  for (const m of SPLIT_METHODS) {
    const c = eurosInputToCents(inputs[m.id]);
    if (c > 0) out[m.id] = c;
  }
  return out;
}

function scrollParentOf(el: HTMLElement | null): HTMLElement | null {
  let node: HTMLElement | null = el?.parentElement ?? null;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
      && node.scrollHeight > node.clientHeight + 1) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

export type ApptPaymentHandle = {
  flush: () => void;
  close: () => void;
};

const ApptPaymentBlock = forwardRef<ApptPaymentHandle, {
  appt: AgendaAppt;
  onError?: (msg: string | null) => void;
  onSaved?: (patch: {
    paid_cents: number;
    payment_method: PaymentMethod | null;
    payment_split: PaymentSplit | null;
  }) => void;
  onOpenChange?: (open: boolean) => void;
}>(function ApptPaymentBlock({ appt, onError, onSaved, onOpenChange }, ref) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const savedScroll = useRef<{ box: HTMLElement; top: number } | null>(null);
  const holdSync = useRef<{ paid: number; method: PaymentMethod | null } | null>(null);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [paidInput, setPaidInput] = useState(centsToEurosInput(appt.paid_cents));
  const [method, setMethod] = useState<PaymentMethod | null>(appt.payment_method);
  const [splitInputs, setSplitInputs] = useState(() => splitToInputs(appt.payment_split));

  const priceCents = appt.price_cents ?? 0;
  const isMixed = method === 'mixed';
  const splitLive = inputsToSplit(splitInputs);
  const paidLive = isMixed ? sumSplit(splitLive) : eurosInputToCents(paidInput);
  const dueLive = owedCents(priceCents, paidLive);
  const paidOk = priceCents > 0 ? paidLive >= priceCents : paidLive > 0;
  const methodName = methodLabel(method);
  const mixedLbl = splitSummary(splitLive);

  const setOpenAndNotify = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    holdSync.current = null;
    setPaidInput(centsToEurosInput(appt.paid_cents));
    setMethod(appt.payment_method);
    setSplitInputs(splitToInputs(appt.payment_split));
  }, [appt.id]);

  useEffect(() => {
    if (holdSync.current) {
      if (
        appt.paid_cents === holdSync.current.paid
        && appt.payment_method === holdSync.current.method
      ) {
        holdSync.current = null;
      } else {
        return;
      }
    }
    setPaidInput(centsToEurosInput(appt.paid_cents));
    setMethod(appt.payment_method);
    setSplitInputs(splitToInputs(appt.payment_split));
  }, [appt.paid_cents, appt.payment_method, appt.payment_split]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (open) {
      const box = scrollParentOf(root);
      if (box && !savedScroll.current) {
        savedScroll.current = { box, top: box.scrollTop };
      }
      let cancelled = false;
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (cancelled) return;
          root.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
      return () => {
        cancelled = true;
        window.cancelAnimationFrame(id);
      };
    }

    const saved = savedScroll.current;
    if (saved) {
      savedScroll.current = null;
      const id = window.requestAnimationFrame(() => {
        saved.box.scrollTo({ top: saved.top, behavior: 'smooth' });
      });
      return () => window.cancelAnimationFrame(id);
    }
  }, [open]);

  const save = (
    nextPaid: number,
    nextMethod: PaymentMethod | null,
    nextSplit: PaymentSplit | null,
  ) => {
    const sameSplit = JSON.stringify(nextSplit ?? null) === JSON.stringify(appt.payment_split ?? null);
    if (nextPaid === appt.paid_cents && nextMethod === appt.payment_method && sameSplit) return;
    onError?.(null);
    holdSync.current = { paid: nextPaid, method: nextMethod };
    setPaidInput(centsToEurosInput(nextPaid));
    setMethod(nextMethod);
    setSplitInputs(splitToInputs(nextSplit));
    startTransition(async () => {
      const r = await updateAppointmentPayment(createClient(), appt.id, {
        paidCents: nextPaid,
        paymentMethod: nextMethod,
        paymentSplit: nextMethod === 'mixed' ? nextSplit : null,
      });
      if (!r.ok) {
        holdSync.current = null;
        setPaidInput(centsToEurosInput(appt.paid_cents));
        setMethod(appt.payment_method);
        setSplitInputs(splitToInputs(appt.payment_split));
        onError?.(r.error ?? 'No se ha podido guardar el cobro');
        return;
      }
      onSaved?.({
        paid_cents: nextPaid,
        payment_method: nextMethod,
        payment_split: nextMethod === 'mixed' ? nextSplit : null,
      });
      router.refresh();
    });
  };

  const saveSingle = (nextPaid: number, nextMethod: PaymentMethod | null) => {
    save(nextPaid, nextMethod, null);
  };

  const saveMixed = (inputs: Record<SplitMethod, string>) => {
    const split = inputsToSplit(inputs);
    save(sumSplit(split), 'mixed', split);
  };

  useImperativeHandle(ref, () => ({
    flush: () => {
      if (method === 'mixed') saveMixed(splitInputs);
      else saveSingle(eurosInputToCents(paidInput), method);
    },
    close: () => setOpenAndNotify(false),
  }), [method, splitInputs, paidInput, appt.paid_cents, appt.payment_method, appt.payment_split]);

  const toggleOpen = () => {
    setOpenAndNotify(!open);
  };

  const clearPayment = () => {
    save(0, null, null);
  };

  const hasPayment = paidLive > 0 || method != null || appt.paid_cents > 0 || appt.payment_method != null;

  const previstoLbl = appt.client_pack_id
    ? (appt.pack_name ? `Bono · ${appt.pack_name}` : 'Bono')
    : eurosLbl(priceCents);

  const summary = (() => {
    if (paidLive <= 0 && !methodName) return 'Sin cobrar';
    if (paidLive <= 0 && methodName) return `${methodName} · sin importe`;
    if (isMixed && mixedLbl) {
      return paidOk ? `Pagado · ${mixedLbl}` : `${mixedLbl} · faltan ${eurosLbl(dueLive)}`;
    }
    if (paidOk) return methodName ? `Pagado · ${methodName}` : 'Pagado';
    const bits = [eurosLbl(paidLive)];
    if (methodName) bits.push(methodName);
    bits.push(`faltan ${eurosLbl(dueLive)}`);
    return bits.join(' · ');
  })();

  return (
    <div ref={rootRef} className="scroll-mt-3 overflow-hidden rounded-[14px] border border-surface-line bg-white">
      <div className="flex items-center gap-1.5 pr-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={toggleOpen}
          className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 text-left"
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
        {hasPayment && (
          <button
            type="button"
            aria-label="Borrar cobro"
            title="Borrar cobro"
            disabled={pending}
            onClick={clearPayment}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-danger-fg hover:bg-danger-bg disabled:opacity-45"
          >
            <X size={17} strokeWidth={2.6} />
          </button>
        )}
      </div>

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
                  if (next === 'mixed') {
                    const seeded = emptySplitInputs();
                    if (eurosInputToCents(paidInput) > 0 && method && method !== 'mixed') {
                      seeded[method as SplitMethod] = paidInput;
                    }
                    setSplitInputs(seeded);
                    setOpen(true);
                    saveMixed(seeded);
                  } else {
                    saveSingle(eurosInputToCents(paidInput), next);
                  }
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

          {isMixed ? (
            <div className="space-y-2.5">
              <p className="text-[12px] font-bold uppercase tracking-[.03em] text-ink-2">
                Importe por forma
              </p>
              {SPLIT_METHODS.map(m => (
                <label key={m.id} className="flex items-center gap-2.5">
                  <span className="w-[4.5rem] shrink-0 text-[14px] font-semibold text-ink">{m.label}</span>
                  <div className="relative min-w-0 flex-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      className={`${inputCls} pr-10`}
                      placeholder="0"
                      value={splitInputs[m.id]}
                      onChange={e => setSplitInputs(prev => ({ ...prev, [m.id]: e.target.value }))}
                      onBlur={e => {
                        const next = { ...splitInputs, [m.id]: e.target.value };
                        setSplitInputs(next);
                        saveMixed(next);
                      }}
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-ink-3">
                      €
                    </span>
                  </div>
                </label>
              ))}
              {Object.keys(splitLive).length === 1 && (
                <p className="text-[12px] font-medium text-ink-2">
                  Añade otro importe para que sea mixto de verdad.
                </p>
              )}
              <div className="flex items-center justify-between pt-1 text-[13px] font-semibold">
                <span className="text-ink-2">Total cobrado</span>
                <span className="tabular-nums text-ink">{eurosLbl(paidLive)}</span>
              </div>
              {priceCents > 0 && paidLive < priceCents && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    const remaining = priceCents - paidLive;
                    const next = { ...splitInputs };
                    // Completar en efectivo si no hay preferencia
                    const base = eurosInputToCents(next.cash);
                    next.cash = centsToEurosInput(base + remaining);
                    setSplitInputs(next);
                    saveMixed(next);
                  }}
                  className="w-full rounded-field border border-surface-line bg-surface-card py-2.5 text-[13px] font-bold text-v-d disabled:opacity-45"
                >
                  Completar previsto en efectivo
                </button>
              )}
            </div>
          ) : (
            <label className="block">
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
                    onBlur={() => saveSingle(eurosInputToCents(paidInput), method)}
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
                      saveSingle(priceCents, method);
                    }}
                    className="shrink-0 rounded-field border border-surface-line bg-surface-card px-3.5 text-[13px] font-bold text-v-d disabled:opacity-45"
                  >
                    Todo
                  </button>
                )}
              </div>
            </label>
          )}
        </div>
      )}
    </div>
  );
});

export default ApptPaymentBlock;
