'use client';

import { useMemo, useState, useTransition } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import {
  createCategory, createService, deleteCategory, deleteService, updateCategory, updateService,
} from '@/app/actions/services';
import SubpageHeader from '@/components/ui/SubpageHeader';
import { LocalSheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { CATEGORIES, catStyle } from '@/lib/categories';
import { fold } from '@/lib/voice';
import type { ServiceCategory, ServiceOption } from '@/lib/types';
import {
  CatalogColorDots,
  CatalogDeleteLink,
  CatalogEmptyRow,
  CatalogGroupCard,
  CatalogRowButton,
  CatalogSearchField,
  DURATION_PRESETS,
  OutlinePillButton,
  PickChip,
  DurationChip,
  SettingsToggleRow,
  SheetField,
  SheetFooter,
  catalogInputCls,
  serviceMeta,
} from './catalog-ui';

type CatRow = ServiceCategory & { slug: string };
type SheetState =
  | { kind: 'cat'; cat?: CatRow }
  | { kind: 'svc'; catId: string; service?: ServiceOption }
  | null;

export default function ServiciosView({
  categories, services,
}: {
  categories: ServiceCategory[];
  services: ServiceOption[];
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [sheet, setSheet] = useState<SheetState>(null);
  const ready = categories.length > 0;

  const cats: CatRow[] = useMemo(() => (
    ready
      ? categories.filter(c => c.is_active !== false).map(c => ({ ...c, slug: c.slug }))
      : Object.entries(CATEGORIES).map(([slug, c], i) => ({
        id: slug,
        slug,
        name: c.label,
        color: c.color,
        sort_order: i,
        is_active: true,
        opens_treatment: slug !== 'valoracion',
      }))
  ), [ready, categories]);

  const needle = fold(query.trim());

  const groups = useMemo(() => cats.map(cat => {
    const all = services.filter(s => (s.category_id && s.category_id === cat.id) || s.category === cat.slug);
    const items = all.filter(s => !needle || fold(s.name).includes(needle));
    const look = catStyle(cat.slug, { color: cat.color, label: cat.name });
    return { cat, look, all, items };
  }).filter(g => !needle || g.items.length > 0), [cats, services, needle]);

  const closeSheet = () => setSheet(null);

  const run = (fn: () => Promise<{ ok: boolean; error: string | null }>, okMsg: string, after?: () => void) => {
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) toast(r.error ?? 'No se ha podido guardar', 'err');
      else {
        toast(okMsg);
        after?.();
      }
    });
  };

  return (
    <>
      <SubpageHeader
        href="/ajustes"
        back="Volver a Ajustes"
        title="Servicios"
        extra={ready ? (
          <OutlinePillButton onClick={() => setSheet({ kind: 'cat' })}>
            <Plus size={15} strokeWidth={2.6} aria-hidden />
            Categoría
          </OutlinePillButton>
        ) : undefined}
      >
        {!ready && (
          <p className="mb-4 rounded-row border border-warn-line bg-warn-bg p-3 text-label font-semibold leading-snug text-warn-fg">
            Falta aplicar la migración del catálogo para crear categorías y servicios nuevos. Mientras, se pueden editar precio y duración.
          </p>
        )}

        <CatalogSearchField
          value={query}
          onChange={setQuery}
          placeholder="Buscar servicio"
        />

        <div className="mt-5 flex flex-col gap-6 pb-2">
          {groups.map(({ cat, look, all, items }) => (
            <section key={cat.id}>
              <div className="mb-2.5 flex items-center gap-2.5 px-1">
                <button
                  type="button"
                  disabled={!ready}
                  onClick={() => ready && setSheet({ kind: 'cat', cat })}
                  className="flex min-w-0 flex-1 items-center gap-2.5 py-1.5 text-left disabled:opacity-100"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-[4px]"
                    style={{ background: look.color }}
                    aria-hidden
                  />
                  <span className="truncate text-body-lg font-bold tracking-[-.01em] text-ink">
                    {look.label}
                  </span>
                  <span className="text-label font-semibold text-ink-3">{all.length}</span>
                  {ready && <ChevronDown size={14} className="shrink-0 text-ink-3" strokeWidth={2.4} aria-hidden />}
                </button>
                {ready && (
                  <OutlinePillButton onClick={() => setSheet({ kind: 'svc', catId: cat.id })}>
                    <Plus size={14} strokeWidth={2.8} aria-hidden />
                    Nuevo
                  </OutlinePillButton>
                )}
              </div>

              <CatalogGroupCard>
                {items.length === 0 ? (
                  <CatalogEmptyRow>Sin servicios en esta categoría.</CatalogEmptyRow>
                ) : (
                  items.map(s => (
                    <CatalogRowButton
                      key={s.id}
                      onClick={() => setSheet({ kind: 'svc', catId: cat.id, service: s })}
                      accent={s.color || look.color}
                      title={s.name}
                      meta={serviceMeta(s.duration_min, s.price_cents)}
                      badge={s.is_active === false ? 'Oculto' : undefined}
                      muted={s.is_active === false}
                    />
                  ))
                )}
              </CatalogGroupCard>
            </section>
          ))}
        </div>
      </SubpageHeader>

      {sheet?.kind === 'cat' && (
        <CategorySheet
          key={sheet.cat?.id ?? 'new-cat'}
          open
          initial={sheet.cat}
          pending={pending}
          serviceCount={sheet.cat
            ? services.filter(s => s.category_id === sheet.cat!.id || s.category === sheet.cat!.slug).length
            : 0}
          onClose={closeSheet}
          onSave={input => run(
            () => sheet.cat
              ? updateCategory({ id: sheet.cat.id, ...input })
              : createCategory(input),
            sheet.cat ? 'Categoría guardada' : `Categoría «${input.name.trim()}» creada`,
            closeSheet,
          )}
          onDelete={sheet.cat ? () => run(
            () => deleteCategory(sheet.cat!.id),
            'Categoría eliminada',
            closeSheet,
          ) : undefined}
        />
      )}

      {sheet?.kind === 'svc' && (
        <ServiceSheet
          key={sheet.service?.id ?? `new-${sheet.catId}`}
          open
          ready={ready}
          categories={cats}
          initial={sheet.service}
          defaultCategoryId={sheet.catId}
          pending={pending}
          onClose={closeSheet}
          onSave={input => run(
            () => sheet.service
              ? updateService({
                id: sheet.service.id,
                name: input.name,
                category_id: ready ? input.category_id : undefined,
                duration_min: input.duration_min,
                price_cents: input.price_cents,
                is_active: input.is_active ?? true,
                color: input.color,
              })
              : createService(input),
            sheet.service ? 'Servicio guardado' : `«${input.name.trim()}» añadido`,
            closeSheet,
          )}
          onDelete={sheet.service && ready
            ? () => run(() => deleteService(sheet.service!.id), 'Servicio quitado', closeSheet)
            : undefined}
        />
      )}
    </>
  );
}

function CategorySheet({
  open, initial, pending, serviceCount, onClose, onSave, onDelete,
}: {
  open: boolean;
  initial?: CatRow;
  pending: boolean;
  serviceCount: number;
  onClose: () => void;
  onSave: (i: { name: string; color: string; opens_treatment: boolean }) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? '#8B5CF6');
  const [opens, setOpens] = useState(initial?.opens_treatment !== false);
  const canSave = name.trim().length > 1;

  return (
    <LocalSheet
      open={open}
      onClose={onClose}
      title={initial ? 'Editar categoría' : 'Nueva categoría'}
      initialHeight="tall"
      floorDetent="tall"
      footer={
        <SheetFooter
          pending={pending}
          canSave={canSave}
          saveLabel="Guardar"
          onCancel={onClose}
          onSave={() => onSave({ name: name.trim(), color, opens_treatment: opens })}
        />
      }
    >
      <div className="flex flex-col gap-5 pb-4">
        <SheetField label="Nombre">
          <input
            className={`${catalogInputCls} h-[54px]`}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="p. ej. Corporal"
          />
        </SheetField>
        <div className="flex flex-col gap-2.5">
          <span className="text-label font-semibold text-ink-2">Color en la agenda</span>
          <CatalogColorDots value={color} onChange={setColor} />
        </div>
        <SettingsToggleRow
          title="Abrir ficha clínica al marcar «Hecha»"
          hint="Para tratamientos que necesitan anotar la sesión."
          on={opens}
          onToggle={() => setOpens(o => !o)}
        />
        {initial && onDelete && (
          <CatalogDeleteLink
            disabled={serviceCount > 0}
            label={serviceCount > 0
              ? `Para borrarla, mueve o quita antes sus ${serviceCount} servicios`
              : 'Borrar categoría'}
            onClick={onDelete}
          />
        )}
      </div>
    </LocalSheet>
  );
}

function ServiceSheet({
  open, ready, categories, initial, defaultCategoryId, pending, onClose, onSave, onDelete,
}: {
  open: boolean;
  ready: boolean;
  categories: CatRow[];
  initial?: ServiceOption;
  defaultCategoryId: string;
  pending: boolean;
  onClose: () => void;
  onSave: (i: {
    name: string;
    category_id: string;
    duration_min: number;
    price_cents: number;
    is_active?: boolean;
    color?: string | null;
  }) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? defaultCategoryId ?? categories[0]?.id ?? '');
  const [mins, setMins] = useState(String(initial?.duration_min ?? 30));
  const [euros, setEuros] = useState(initial ? String(initial.price_cents / 100) : '');
  const [active, setActive] = useState(initial?.is_active !== false);
  const [color, setColor] = useState<string | null>(initial?.color ?? null);
  const catColor = categories.find(c => c.id === categoryId)?.color ?? '#8B5CF6';
  const durNum = Number(mins);
  const priceNum = euros === '' ? NaN : Number(String(euros).replace(',', '.'));
  const canSave = name.trim().length > 1 && durNum > 0 && euros !== '' && !Number.isNaN(priceNum);
  const saveLabel = !name.trim()
    ? 'Escribe un nombre'
    : euros === ''
      ? 'Falta el precio'
      : initial
        ? 'Guardar cambios'
        : 'Crear servicio';

  return (
    <LocalSheet
      open={open}
      onClose={onClose}
      title={initial ? 'Editar servicio' : 'Nuevo servicio'}
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
            category_id: categoryId,
            duration_min: durNum,
            price_cents: Math.round(priceNum * 100),
            is_active: active,
            color,
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
            placeholder="p. ej. Radiofrecuencia"
          />
        </SheetField>

        {categories.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-label font-semibold text-ink-2">Categoría</span>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <PickChip
                  key={c.id}
                  active={c.id === categoryId}
                  onClick={() => setCategoryId(c.id)}
                >
                  <span className="h-2 w-2 rounded-pill" style={{ background: c.color }} aria-hidden />
                  {c.name}
                </PickChip>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-label font-semibold text-ink-2">Duración</span>
          <div className="flex gap-2">
            {DURATION_PRESETS.map(m => (
              <DurationChip
                key={m}
                minutes={m}
                active={durNum === m}
                onClick={() => setMins(String(m))}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SheetField label="Minutos">
            <input
              className={`${catalogInputCls} h-[54px]`}
              inputMode="numeric"
              value={mins}
              onChange={e => setMins(e.target.value.replace(/\D/g, ''))}
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

        <div className="flex flex-col gap-2.5">
          <span className="text-label font-semibold text-ink-2">Color en la agenda</span>
          <CatalogColorDots
            value={color ?? catColor}
            inheritColor={catColor}
            inheritActive={!color}
            onInherit={() => setColor(null)}
            onChange={setColor}
          />
        </div>

        {initial && (
          <SettingsToggleRow
            title="Visible al crear citas"
            hint="Si lo ocultas, sigue en el historial pero no se puede elegir."
            on={active}
            onToggle={() => setActive(a => !a)}
          />
        )}

        {onDelete && (
          <CatalogDeleteLink label="Quitar del catálogo" onClick={onDelete} />
        )}
      </div>
    </LocalSheet>
  );
}
