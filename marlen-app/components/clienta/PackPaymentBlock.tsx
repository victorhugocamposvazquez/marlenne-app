'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, X } from 'lucide-react';
import { inputCls } from '@/components/Sheet';
import { updatePackPayment } from '@/lib/pack-write';
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
import type { ClientPack } from '@/lib/types';

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

export default function PackPaymentBlock({
  pack,
  onError,
  onSaved,
}: {
  pack: ClientPack;
  onError?: (msg: string | null) => void;
  onSaved?: (patch: {
    paid_cents: number;
    payment_method: PaymentMethod | null;
    payment_split: PaymentSplit | null;
  }) => void;
}) {
  const router = useRouter();
  const holdSync = useRef<{ paid: number; method: PaymentMethod | null } | null>(null);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [paidInput, setPaidInput] = useState(centsToEurosInput(pack.paid_cents));
  const [method, setMethod] = useState<PaymentMethod | null>(pack.payment_method);
  const [splitInputs, setSplitInputs] = useState(() => splitToInputs(pack.payment_split));

  const priceCents = pack.price_cents ?? 0;
  const isMixed = method === 'mixed';
  const splitLive = inputsToSplit(splitInputs);
  const paidLive = isMixed ? sumSplit(splitLive) : eurosInputToCents(paidInput);
  const dueLive = owedCents(priceCents, paidLive);
  const paidOk = priceCents > 0 ? paidLive >= priceCents : paidLive > 0;
  const methodName = methodLabel(method);
  const mixedLbl = splitSummary(splitLive);

  useEffect(() => {
    holdSync.current = null;
    setPaidInput(centsToEurosInput(pack.paid_cents));
    setMethod(pack.payment_method);
    setSplitInputs(splitToInputs(pack.payment_split));
  }, [pack.id]);

  useEffect(() => {
    if (holdSync.current) {
      if (
        pack.paid_cents === holdSync.current.paid
        && pack.payment_method === holdSync.current.method
      ) {
        holdSync.current = null;
      } else {
        return;
      }
    }
    setPaidInput(centsToEurosInput(pack.paid_cents));
    setMethod(pack.payment_method);
    setSplitInputs(splitToInputs(pack.payment_split));
  }, [pack.paid_cents, pack.payment_method, pack.payment_split]);

  const save = (
    nextPaid: number,
    nextMethod: PaymentMethod | null,
    nextSplit: PaymentSplit | null,
  ) => {
    const sameSplit = JSON.stringify(nextSplit ?? null) === JSON.stringify(pack.payment_split ?? null);
    if (nextPaid === pack.paid_cents && nextMethod === pack.payment_method && sameSplit) return;
    onError?.(null);
    holdSync.current = { paid: nextPaid, method: nextMethod };
    setPaidInput(centsToEurosInput(nextPaid));
    setMethod(nextMethod);
    setSplitInputs(splitToInputs(nextSplit));
    startTransition(async () => {
      const r = await updatePackPayment(createClient(), pack.id, {
        paidCents: nextPaid,
        paymentMethod: nextMethod,
        paymentSplit: nextMethod === 'mixed' ? nextSplit : null,
      });
      if (!r.ok) {
        holdSync.current = null;
        setPaidInput(centsToEurosInput(pack.paid_cents));
        setMethod(pack.payment_method);
        setSplitInputs(splitToInputs(pack.payment_split));
        onError?.(r.error ?? 'No se ha podido guardar el cobro del bono');
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

  const clearPayment = () => {
    save(0, null, null);
  };

  const hasPayment = paidLive > 0 || method != null || pack.paid_cents > 0 || pack.payment_method != null;

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
    <div className="mt-3 overflow-hidden rounded-[14px] border border-surface-line bg-white">
      <div className="flex items-center gap-1.5 pr-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-3 text-left"
        >
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
              paidOk ? 'bg-ok-bg text-ok-strong' : dueLive > 0 && paidLive > 0 ? 'bg-warn-bg text-warn-fg' : 'bg-surface-soft text-ink-3'
            }`}
          >
            {paidOk ? <Check size={14} strokeWidth={2.8} /> : (
              <span className="text-[10px] font-extrabold tabular-nums">€</span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold tracking-[-.01em] text-ink">Cobro del bono</span>
            <span className={`mt-0.5 block truncate text-[12px] font-medium ${
              paidOk ? 'text-ok-strong' : dueLive > 0 && paidLive > 0 ? 'text-warn-fg' : 'text-ink-2'
            }`}>
              {summary}
            </span>
          </span>
          <ChevronDown
            size={16}
            strokeWidth={2.4}
            className={`shrink-0 text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        {hasPayment && (
          <button
            type="button"
            aria-label="Borrar cobro del bono"
            title="Borrar cobro"
            disabled={pending}
            onClick={clearPayment}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-danger-fg hover:bg-danger-bg disabled:opacity-45"
          >
            <X size={15} strokeWidth={2.6} />
          </button>
        )}
      </div>

      {open && (
        <div className="border-t border-surface-line px-3.5 pb-3.5 pt-3">
          <div className="mb-3 grid grid-cols-2 gap-2.5">
            <div className="rounded-[12px] bg-surface-soft px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[.04em] text-ink-3">Precio bono</p>
              <p className="mt-0.5 text-[16px] font-extrabold tabular-nums text-ink">
                {priceCents > 0 ? eurosLbl(priceCents) : '—'}
              </p>
            </div>
            <div className={`rounded-[12px] px-3 py-2 ${dueLive > 0 ? 'bg-danger-bg' : 'bg-ok-bg'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-[.04em] ${
                dueLive > 0 ? 'text-danger-fg/70' : 'text-ok-strong/70'
              }`}>
                {dueLive > 0 ? 'A deber' : 'Estado'}
              </p>
              <p className={`mt-0.5 text-[16px] font-extrabold tabular-nums ${
                dueLive > 0 ? 'text-danger-fg' : 'text-ok-strong'
              }`}>
                {dueLive > 0 ? eurosLbl(dueLive) : 'Pagado'}
              </p>
            </div>
          </div>

          <label className="mb-2.5 block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.03em] text-ink-2">
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
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[.03em] text-ink-2">
                Importe por forma (tramos)
              </p>
              {SPLIT_METHODS.map(m => (
                <label key={m.id} className="flex items-center gap-2.5">
                  <span className="w-[4.5rem] shrink-0 text-[13px] font-semibold text-ink">{m.label}</span>
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
                      disabled={pending}
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-ink-3">€</span>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.03em] text-ink-2">
                Cobrado (puedes ir por tramos)
              </span>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  className={`${inputCls} pr-10`}
                  placeholder={priceCents > 0 ? centsToEurosInput(priceCents) : '0'}
                  value={paidInput}
                  onChange={e => setPaidInput(e.target.value)}
                  onBlur={e => saveSingle(eurosInputToCents(e.target.value), method)}
                  disabled={pending}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-ink-3">€</span>
              </div>
              {priceCents > 0 && paidLive < priceCents && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      const next = centsToEurosInput(priceCents);
                      setPaidInput(next);
                      saveSingle(priceCents, method ?? 'cash');
                    }}
                    className="rounded-chip bg-v-tint px-2.5 py-1.5 text-[12px] font-bold text-v-d"
                  >
                    Todo pagado
                  </button>
                  {dueLive > 0 && paidLive > 0 && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        const next = centsToEurosInput(priceCents);
                        setPaidInput(next);
                        saveSingle(priceCents, method);
                      }}
                      className="rounded-chip bg-surface-soft px-2.5 py-1.5 text-[12px] font-bold text-ink-2"
                    >
                      Completar {eurosLbl(dueLive)}
                    </button>
                  )}
                </div>
              )}
            </label>
          )}
        </div>
      )}
    </div>
  );
}
