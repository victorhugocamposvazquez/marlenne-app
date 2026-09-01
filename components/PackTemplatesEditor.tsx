'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { upsertPackTemplate } from '@/lib/pack-write';
import { createClient } from '@/lib/supabase/client';
import { inputCls } from '@/components/Sheet';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/Toast';
import type { PackTemplate, ServiceOption } from '@/lib/types';

export default function PackTemplatesEditor({
  templates, services,
}: {
  templates: PackTemplate[];
  services: ServiceOption[];
}) {
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = (input: Parameters<typeof upsertPackTemplate>[1]) => {
    startTransition(async () => {
      const r = await upsertPackTemplate(createClient(), input);
      if (!r.ok) toast(r.error ?? 'No se ha podido guardar', 'err');
      else {
        toast(input.id ? 'Bono actualizado' : 'Bono del catálogo creado');
        setOpen(null);
        setCreating(false);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {templates.length === 0 && !creating && (
        <p className="text-label font-medium text-ink-2">
          Aún no hay bonos de catálogo. El de 6 láser o el de 4 cavitación se venden desde la ficha.
        </p>
      )}
      {templates.map(t => (
        <div key={t.id} className="overflow-hidden rounded-row border border-surface-line bg-surface-card">
          <button
            type="button"
            onClick={() => { setCreating(false); setOpen(o => o === t.id ? null : t.id); }}
            className="flex w-full items-baseline justify-between gap-3 px-3.5 py-2.5 text-left"
          >
            <span className={`min-w-0 truncate text-body font-semibold ${t.is_active ? '' : 'text-ink-3 line-through'}`}>
              {t.name}
            </span>
            <span className="shrink-0 text-caption font-bold tabular-nums text-ink-3">
              {t.sessions_total} ses. · {(t.price_cents / 100).toFixed(0)} €
            </span>
          </button>
          {open === t.id && (
            <TemplateForm
              key={t.id}
              template={t}
              services={services}
              pending={pending}
              onSave={patch => save({ id: t.id, ...patch })}
            />
          )}
        </div>
      ))}
      {creating ? (
        <div className="overflow-hidden rounded-row border border-v/30 bg-surface-card">
          <p className="px-3.5 pt-3 text-body font-bold">Nuevo bono de catálogo</p>
          <TemplateForm
            services={services}
            pending={pending}
            onSave={patch => save(patch)}
            onCancel={() => setCreating(false)}
          />
        </div>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => { setOpen(null); setCreating(true); }}>
          Añadir bono
        </Button>
      )}
    </div>
  );
}

function TemplateForm({
  template, services, pending, onSave, onCancel,
}: {
  template?: PackTemplate;
  services: ServiceOption[];
  pending: boolean;
  onSave: (p: {
    name: string;
    service_id: string | null;
    sessions_total: number;
    price_cents: number;
    valid_days: number | null;
    is_active: boolean;
  }) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(template?.name ?? '');
  const [serviceId, setServiceId] = useState(template?.service_id ?? '');
  const [sessions, setSessions] = useState(String(template?.sessions_total ?? 6));
  const [euros, setEuros] = useState(String((template?.price_cents ?? 0) / 100));
  const [days, setDays] = useState(template?.valid_days ? String(template.valid_days) : '');
  const [active, setActive] = useState(template?.is_active !== false);

  return (
    <div className="grid grid-cols-2 gap-2 px-3.5 pb-3">
      <label className="col-span-2">
        <span className="mb-1 block text-caption font-bold uppercase text-ink-2">Nombre</span>
        <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Bono láser 6" />
      </label>
      <label className="col-span-2">
        <span className="mb-1 block text-caption font-bold uppercase text-ink-2">Servicio</span>
        <select className={inputCls} value={serviceId} onChange={e => setServiceId(e.target.value)}>
          <option value="">Cualquier servicio</option>
          {services.filter(s => s.is_active !== false).map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="mb-1 block text-caption font-bold uppercase text-ink-2">Sesiones</span>
        <input className={inputCls} inputMode="numeric" value={sessions} onChange={e => setSessions(e.target.value)} />
      </label>
      <label>
        <span className="mb-1 block text-caption font-bold uppercase text-ink-2">Precio €</span>
        <input className={inputCls} inputMode="decimal" value={euros} onChange={e => setEuros(e.target.value)} />
      </label>
      <label className="col-span-2">
        <span className="mb-1 block text-caption font-bold uppercase text-ink-2">Caduca a los (días)</span>
        <input
          className={inputCls}
          inputMode="numeric"
          placeholder="Vacío = no caduca"
          value={days}
          onChange={e => setDays(e.target.value)}
        />
      </label>
      {template && (
        <label className="col-span-2 flex items-center gap-2.5 text-body font-bold">
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
          Visible al vender
        </label>
      )}
      <div className={`flex gap-2 ${template ? 'col-span-2' : 'col-span-2'}`}>
        {onCancel && (
          <Button variant="secondary" className="flex-1" disabled={pending} onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button
          className="flex-1"
          full={!onCancel}
          disabled={pending}
          onClick={() => onSave({
            name,
            service_id: serviceId || null,
            sessions_total: Number(sessions),
            price_cents: Math.round(Number(euros.replace(',', '.')) * 100) || 0,
            valid_days: days.trim() ? Number(days) : null,
            is_active: active,
          })}
        >
          {pending ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}
