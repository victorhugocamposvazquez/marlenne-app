'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { LocalSheet } from '@/components/Sheet';
import { deletePackTemplate, upsertPackTemplate } from '@/lib/pack-write';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import {
  CatalogDeleteLink,
  CatalogEmptyRow,
  CatalogGroupCard,
  CatalogRowButton,
  OutlinePillButton,
  SettingsToggleRow,
  SheetField,
  SheetFooter,
  catalogInputCls,
} from '@/components/catalog/catalog-ui';
import type { PackTemplate, ServiceOption } from '@/lib/types';

export default function PackTemplatesEditor({
  templates, services,
}: {
  templates: PackTemplate[];
  services: ServiceOption[];
}) {
  const toast = useToast();
  const router = useRouter();
  const [sheet, setSheet] = useState<{ template?: PackTemplate } | 'new' | null>(null);
  const [pending, startTransition] = useTransition();

  const close = () => setSheet(null);

  const run = (
    fn: () => Promise<{ ok: boolean; error: string | null }>,
    okMsg: string,
    after?: () => void,
  ) => {
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) toast(r.error ?? 'No se ha podido guardar', 'err');
      else {
        toast(okMsg);
        after?.();
        router.refresh();
      }
    });
  };

  return (
    <>
      <div className="mb-2.5 flex items-center justify-end">
        <OutlinePillButton onClick={() => setSheet('new')}>
          <Plus size={14} strokeWidth={2.8} aria-hidden />
          Bono
        </OutlinePillButton>
      </div>

      {templates.length === 0 ? (
        <CatalogEmptyRow>
          Aún no hay bonos de catálogo. Crea el de 6 láser o el de 4 cavitación.
        </CatalogEmptyRow>
      ) : (
        <CatalogGroupCard>
          {templates.map(t => (
            <CatalogRowButton
              key={t.id}
              onClick={() => setSheet({ template: t })}
              title={t.name}
              muted={!t.is_active}
              badge={t.is_active ? undefined : 'Oculto'}
              meta={[
                t.service_name ?? 'Cualquier tratamiento',
                `${t.sessions_total} ses.`,
                t.price_cents > 0 ? `${(t.price_cents / 100).toFixed(0)} €` : 'sin precio',
              ].join(' · ')}
            />
          ))}
        </CatalogGroupCard>
      )}

      {sheet && (
        <PackTemplateSheet
          key={sheet === 'new' ? 'new' : sheet.template?.id}
          open
          services={services}
          initial={sheet === 'new' ? undefined : sheet.template}
          pending={pending}
          onClose={close}
          onSave={input => run(
            () => upsertPackTemplate(createClient(), {
              id: sheet === 'new' ? undefined : sheet.template?.id,
              ...input,
            }),
            sheet === 'new' ? `Bono «${input.name.trim()}» creado` : 'Bono actualizado',
            close,
          )}
          onDelete={sheet !== 'new' && sheet.template
            ? () => run(
              () => deletePackTemplate(createClient(), sheet.template!.id),
              'Bono eliminado',
              close,
            )
            : undefined}
        />
      )}
    </>
  );
}

function PackTemplateSheet({
  open, services, initial, pending, onClose, onSave, onDelete,
}: {
  open: boolean;
  services: ServiceOption[];
  initial?: PackTemplate;
  pending: boolean;
  onClose: () => void;
  onSave: (p: {
    name: string;
    service_id: string | null;
    sessions_total: number;
    price_cents: number;
    valid_days: number | null;
    is_active: boolean;
  }) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [serviceId, setServiceId] = useState(initial?.service_id ?? '');
  const [sessions, setSessions] = useState(String(initial?.sessions_total ?? 6));
  const [euros, setEuros] = useState(initial ? String((initial.price_cents ?? 0) / 100) : '');
  const [days, setDays] = useState(initial?.valid_days ? String(initial.valid_days) : '');
  const [active, setActive] = useState(initial?.is_active !== false);

  const sessionsNum = Number(sessions);
  const priceNum = euros === '' ? NaN : Number(String(euros).replace(',', '.'));
  const canSave = name.trim().length > 1 && sessionsNum >= 1 && euros !== '' && !Number.isNaN(priceNum) && priceNum >= 0;
  const saveLabel = !name.trim()
    ? 'Escribe un nombre'
    : sessionsNum < 1
      ? 'Faltan las sesiones'
      : euros === ''
        ? 'Falta el precio'
        : initial
          ? 'Guardar cambios'
          : 'Crear bono';

  return (
    <LocalSheet
      open={open}
      onClose={onClose}
      title={initial ? 'Editar bono' : 'Nuevo bono'}
      initialHeight="tall"
      floorDetent="tall"
      footer={
        <SheetFooter
          pending={pending}
          canSave={canSave}
          saveLabel={saveLabel}
          onCancel={onClose}
          onSave={() => onSave({
            name: name.trim(),
            service_id: serviceId || null,
            sessions_total: sessionsNum,
            price_cents: Math.round(priceNum * 100),
            valid_days: days.trim() ? Number(days) : null,
            is_active: active,
          })}
        />
      }
    >
      <div className="flex flex-col gap-5 pb-4">
        <SheetField label="Nombre">
          <input
            className={`${catalogInputCls} h-[54px]`}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="p. ej. Bono láser 6"
          />
        </SheetField>

        <SheetField label="Tratamiento">
          <select
            className={`${catalogInputCls} h-[54px]`}
            value={serviceId}
            onChange={e => setServiceId(e.target.value)}
          >
            <option value="">Cualquier tratamiento</option>
            {services.filter(s => s.is_active !== false).map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </SheetField>

        <div className="grid grid-cols-2 gap-3">
          <SheetField label="Sesiones">
            <input
              className={`${catalogInputCls} h-[54px]`}
              inputMode="numeric"
              value={sessions}
              onChange={e => setSessions(e.target.value.replace(/\D/g, ''))}
            />
          </SheetField>
          <SheetField label="Precio">
            <div className="flex h-[54px] items-center gap-1 rounded-field bg-surface-soft px-4">
              <input
                className="min-w-0 flex-1 border-none bg-transparent text-body-lg font-semibold text-ink outline-none"
                inputMode="decimal"
                value={euros}
                onChange={e => setEuros(e.target.value.replace(/[^\d.,]/g, ''))}
              />
              <span className="text-body-lg font-semibold text-ink-3">€</span>
            </div>
          </SheetField>
        </div>

        <SheetField label="Caduca a los (días)">
          <input
            className={`${catalogInputCls} h-[54px]`}
            inputMode="numeric"
            placeholder="Vacío = no caduca"
            value={days}
            onChange={e => setDays(e.target.value.replace(/\D/g, ''))}
          />
        </SheetField>

        {initial && (
          <SettingsToggleRow
            title="Visible al crear citas"
            hint="Si lo ocultas, no sale en el selector; los ya vendidos siguen."
            on={active}
            onToggle={() => setActive(a => !a)}
          />
        )}

        {onDelete && (
          <CatalogDeleteLink label="Eliminar bono del catálogo" onClick={onDelete} />
        )}
      </div>
    </LocalSheet>
  );
}
