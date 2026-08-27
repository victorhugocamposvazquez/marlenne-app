'use client';

import { useState, useTransition } from 'react';
import { updateService } from '@/app/actions/services';
import { CATEGORIES } from '@/lib/categories';
import { durLbl } from '@/lib/time';
import { inputCls } from '@/components/Sheet';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/Toast';
import type { ServiceOption } from '@/lib/types';

export default function CatalogEditor({ services }: { services: ServiceOption[] }) {
  const toast = useToast();
  const [open, setOpen] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      {Object.entries(CATEGORIES).map(([id, cat]) => {
        const list = services.filter(s => s.category === id);
        if (!list.length) return null;
        return (
          <div key={id}>
            <div className="mb-1.5 flex items-center gap-1.5 text-label font-bold" style={{ color: cat.fg }}>
              <span className="h-2 w-2 rounded-sm" style={{ background: cat.color }} />
              {cat.label}
            </div>
            <div className="overflow-hidden rounded-row border border-surface-line bg-surface-card">
              {list.map(s => (
                <div key={s.id} className="border-b border-surface-line last:border-0">
                  <button
                    type="button"
                    onClick={() => setOpen(o => o === s.id ? null : s.id)}
                    className="flex w-full items-baseline justify-between gap-3 px-3.5 py-2.5 text-left"
                  >
                    <span className={`min-w-0 truncate text-body font-semibold ${s.is_active === false ? 'text-ink-3 line-through' : ''}`}>
                      {s.name}
                    </span>
                    <span className="shrink-0 text-caption font-bold tabular-nums text-ink-3">
                      {durLbl(s.duration_min)} · {(s.price_cents / 100).toFixed(0)} €
                    </span>
                  </button>
                  {open === s.id && (
                    <EditRow
                      service={s}
                      pending={pending}
                      onSave={(patch) => startTransition(async () => {
                        const r = await updateService({ id: s.id, ...patch });
                        if (!r.ok) toast(r.error ?? 'No se ha podido guardar', 'err');
                        else {
                          toast('Servicio actualizado');
                          setOpen(null);
                        }
                      })}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EditRow({
  service, pending, onSave,
}: {
  service: ServiceOption;
  pending: boolean;
  onSave: (p: { duration_min: number; price_cents: number; is_active: boolean }) => void;
}) {
  const [mins, setMins] = useState(String(service.duration_min));
  const [euros, setEuros] = useState(String(service.price_cents / 100));
  const [active, setActive] = useState(service.is_active !== false);

  return (
    <div className="grid grid-cols-2 gap-2 px-3.5 pb-3">
      <label>
        <span className="mb-1 block text-caption font-bold uppercase text-ink-2">Minutos</span>
        <input className={inputCls} inputMode="numeric" value={mins} onChange={e => setMins(e.target.value)} />
      </label>
      <label>
        <span className="mb-1 block text-caption font-bold uppercase text-ink-2">Precio €</span>
        <input className={inputCls} inputMode="decimal" value={euros} onChange={e => setEuros(e.target.value)} />
      </label>
      <label className="col-span-2 flex items-center gap-2.5 text-body font-bold">
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
        Visible al crear citas
      </label>
      <Button
        className="col-span-2"
        full
        disabled={pending}
        onClick={() => onSave({
          duration_min: Number(mins),
          price_cents: Math.round(Number(euros.replace(',', '.')) * 100),
          is_active: active,
        })}
      >
        {pending ? 'Guardando…' : 'Guardar'}
      </Button>
    </div>
  );
}
