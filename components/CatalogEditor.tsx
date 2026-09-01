'use client';

import { useState, useTransition } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  createCategory, createService, deleteCategory, deleteService, updateCategory, updateService,
} from '@/app/actions/services';
import { CAT_COLORS, CATEGORIES, catStyle } from '@/lib/categories';
import { durLbl } from '@/lib/time';
import { inputCls } from '@/components/Sheet';
import Button from '@/components/ui/Button';
import ColorDots from '@/components/ui/ColorDots';
import { useToast } from '@/components/Toast';
import type { ServiceCategory, ServiceOption } from '@/lib/types';

export default function CatalogEditor({
  categories, services,
}: {
  categories: ServiceCategory[];
  services: ServiceOption[];
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [addingCat, setAddingCat] = useState(false);
  const [addingSvc, setAddingSvc] = useState<string | null>(null);
  const [editCat, setEditCat] = useState<string | null>(null);
  const [editSvc, setEditSvc] = useState<string | null>(null);
  const ready = categories.length > 0;

  const cats = ready
    ? categories.filter(c => c.is_active !== false)
    : Object.entries(CATEGORIES).map(([slug, c], i) => ({
      id: slug,
      slug,
      name: c.label,
      color: c.color,
      sort_order: i,
      is_active: true,
      opens_treatment: slug !== 'valoracion',
    }));

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
    <div>
      {ready ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setAddingCat(a => !a); setAddingSvc(null); }}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-chip bg-v-soft px-3 text-label font-bold text-v-d motion-safe:active:scale-[.97]"
          >
            <Plus size={16} strokeWidth={2.4} />
            {addingCat ? 'Cerrar' : 'Nueva categoría'}
          </button>
          {cats[0] && (
            <button
              type="button"
              onClick={() => { setAddingSvc(s => s ? null : cats[0].id); setAddingCat(false); }}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-chip border border-surface-line bg-surface-card px-3 text-label font-bold text-ink-2 motion-safe:active:scale-[.97]"
            >
              <Plus size={16} strokeWidth={2.4} />
              Nuevo servicio
            </button>
          )}
        </div>
      ) : (
        <p className="mb-4 rounded-row border border-warn-line bg-warn-bg p-3 text-label font-semibold leading-snug text-warn-fg">
          Falta aplicar la migración del catálogo para crear categorías y servicios nuevos. Mientras, se pueden editar precio y duración.
        </p>
      )}

      {addingCat && (
        <CategoryForm
          pending={pending}
          onCancel={() => setAddingCat(false)}
          onSave={input => run(() => createCategory(input), 'Categoría creada', () => setAddingCat(false))}
        />
      )}

      <div className="flex flex-col gap-5">
        {cats.map(cat => {
          const list = services.filter(s => (s.category_id && s.category_id === cat.id) || s.category === cat.slug);
          const look = catStyle(cat.slug, { color: cat.color, label: cat.name });
          return (
            <section key={cat.id}>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: look.color }} />
                <h2 className="min-w-0 flex-1 text-body font-extrabold" style={{ color: look.fg }}>
                  {look.label}
                  <span className="ml-1.5 font-semibold text-ink-3">{list.length}</span>
                </h2>
                {ready && (
                  <button
                    type="button"
                    onClick={() => setEditCat(e => e === cat.id ? null : cat.id)}
                    className="inline-flex min-h-[44px] items-center gap-1 px-1.5 text-label font-bold text-v-d"
                  >
                    <Pencil size={14} strokeWidth={2.3} />
                    {editCat === cat.id ? 'Cerrar' : 'Editar'}
                  </button>
                )}
              </div>

              {addingSvc === cat.id && (
                <ServiceForm
                  categories={cats}
                  defaultCategoryId={cat.id}
                  pending={pending}
                  onCancel={() => setAddingSvc(null)}
                  onSave={input => run(() => createService(input), 'Servicio creado', () => setAddingSvc(null))}
                />
              )}

              {editCat === cat.id && (
                <CategoryForm
                  initial={cat}
                  pending={pending}
                  canDelete={list.length === 0}
                  onCancel={() => setEditCat(null)}
                  onSave={input => run(
                    () => updateCategory({ id: cat.id, ...input }),
                    'Categoría actualizada',
                    () => setEditCat(null),
                  )}
                  onDelete={() => run(() => deleteCategory(cat.id), 'Categoría eliminada', () => setEditCat(null))}
                />
              )}

              <div className="overflow-hidden rounded-row border border-surface-line bg-surface-card shadow-card">
                {list.length === 0 && (
                  <p className="px-3.5 py-3 text-label font-medium text-ink-2">Todavía no hay servicios aquí.</p>
                )}
                {list.map(s => (
                  <div key={s.id} className="border-b border-surface-line last:border-0">
                    <div className="flex items-center gap-2 px-3.5 py-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ background: s.color || look.color }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-body font-semibold ${s.is_active === false ? 'text-ink-3 line-through' : ''}`}>
                          {s.name}
                        </span>
                        <span className="block text-caption font-bold tabular-nums text-ink-3">
                          {durLbl(s.duration_min)} · {(s.price_cents / 100).toFixed(0)} €
                          {s.is_active === false ? ' · oculto' : ''}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditSvc(e => e === s.id ? null : s.id)}
                        className="inline-flex min-h-[44px] shrink-0 items-center gap-1 text-label font-bold text-v-d"
                      >
                        <Pencil size={14} strokeWidth={2.3} />
                        {editSvc === s.id ? 'Cerrar' : 'Editar'}
                      </button>
                    </div>
                    {editSvc === s.id && (
                      <ServiceForm
                        service={s}
                        categories={cats}
                        pending={pending}
                        onCancel={() => setEditSvc(null)}
                        onSave={input => run(
                          () => updateService({
                            id: s.id,
                            name: input.name,
                            category_id: ready ? input.category_id : undefined,
                            duration_min: input.duration_min,
                            price_cents: input.price_cents,
                            is_active: input.is_active ?? true,
                            color: input.color,
                          }),
                          'Servicio actualizado',
                          () => setEditSvc(null),
                        )}
                        onDelete={ready
                          ? () => run(() => deleteService(s.id), 'Servicio quitado', () => setEditSvc(null))
                          : undefined}
                      />
                    )}
                  </div>
                ))}
                {ready && (
                  <button
                    type="button"
                    onClick={() => { setAddingSvc(cat.id); setAddingCat(false); setEditSvc(null); }}
                    className="flex min-h-[44px] w-full items-center gap-1.5 px-3.5 text-left text-label font-bold text-v-d motion-safe:active:bg-v-tint"
                  >
                    <Plus size={15} strokeWidth={2.4} />
                    Añadir a {look.label}
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function CategoryForm({
  initial, pending, canDelete, onSave, onCancel, onDelete,
}: {
  initial?: ServiceCategory;
  pending: boolean;
  canDelete?: boolean;
  onSave: (i: { name: string; color: string; opens_treatment: boolean }) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? CAT_COLORS[0]);
  const [opens, setOpens] = useState(initial?.opens_treatment !== false);

  return (
    <div className="mb-4 rounded-row border border-surface-line bg-surface-card p-3.5 shadow-card">
      <label className="block">
        <span className="mb-1 block text-caption font-bold uppercase text-ink-2">Nombre</span>
        <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Manicura" />
      </label>
      <div className="mt-3">
        <span className="mb-1.5 block text-caption font-bold uppercase text-ink-2">Color en la agenda</span>
        <ColorDots value={color} onChange={setColor} />
      </div>
      <label className="mt-3 flex items-center gap-2.5 text-body font-bold">
        <input type="checkbox" checked={opens} onChange={e => setOpens(e.target.checked)} />
        Abre ficha clínica al marcar Hecha
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          className="flex-1"
          disabled={pending}
          onClick={() => onSave({ name, color, opens_treatment: opens })}
        >
          {pending ? 'Guardando…' : initial ? 'Guardar' : 'Crear categoría'}
        </Button>
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
      </div>
      {initial && onDelete && (
        <button
          type="button"
          disabled={pending || !canDelete}
          onClick={onDelete}
          className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-label font-bold text-danger-fg disabled:opacity-40"
        >
          <Trash2 size={14} strokeWidth={2.3} />
          {canDelete ? 'Eliminar categoría' : 'Vacía la categoría para poder borrarla'}
        </button>
      )}
    </div>
  );
}

function ServiceForm({
  service, categories, defaultCategoryId, pending, onSave, onCancel, onDelete,
}: {
  service?: ServiceOption;
  categories: ServiceCategory[];
  defaultCategoryId?: string;
  pending: boolean;
  onSave: (i: {
    name: string;
    category_id: string;
    duration_min: number;
    price_cents: number;
    is_active?: boolean;
    color?: string | null;
  }) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(service?.name ?? '');
  const [categoryId, setCategoryId] = useState(
    service?.category_id ?? defaultCategoryId ?? categories[0]?.id ?? '',
  );
  const [mins, setMins] = useState(String(service?.duration_min ?? 30));
  const [euros, setEuros] = useState(service ? String(service.price_cents / 100) : '0');
  const [active, setActive] = useState(service?.is_active !== false);
  const [color, setColor] = useState(service?.color ?? '');
  const catColor = categories.find(c => c.id === categoryId)?.color ?? CAT_COLORS[0];

  return (
    <div className={service
      ? 'border-t border-surface-line bg-v-tint/40 px-3.5 py-3'
      : 'mb-2 rounded-row border border-surface-line bg-surface-card p-3.5 shadow-card'}>
      <label className="block">
        <span className="mb-1 block text-caption font-bold uppercase text-ink-2">Nombre</span>
        <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Radiofrecuencia" />
      </label>
      {categories.length > 0 && (
        <label className="mt-2 block">
          <span className="mb-1 block text-caption font-bold uppercase text-ink-2">Categoría</span>
          <select className={inputCls} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      )}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label>
          <span className="mb-1 block text-caption font-bold uppercase text-ink-2">Minutos</span>
          <input className={inputCls} inputMode="numeric" value={mins} onChange={e => setMins(e.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-caption font-bold uppercase text-ink-2">Precio €</span>
          <input className={inputCls} inputMode="decimal" value={euros} onChange={e => setEuros(e.target.value)} />
        </label>
      </div>
      <div className="mt-3">
        <span className="mb-1.5 block text-caption font-bold uppercase text-ink-2">Color en la agenda</span>
        <button
          type="button"
          onClick={() => setColor('')}
          className={`mb-2 min-h-[40px] rounded-chip px-3 text-label font-bold ${
            !color ? 'bg-v-soft text-v-d' : 'border border-surface-line bg-surface-card text-ink-2'
          }`}
        >
          El de la categoría
        </button>
        <ColorDots value={color || catColor} onChange={setColor} />
      </div>
      {service && (
        <label className="mt-2 flex items-center gap-2.5 text-body font-bold">
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
          Visible al crear citas
        </label>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          className="flex-1"
          disabled={pending}
          onClick={() => onSave({
            name,
            category_id: categoryId,
            duration_min: Number(mins),
            price_cents: Math.round(Number(euros.replace(',', '.')) * 100),
            is_active: active,
            color: color || null,
          })}
        >
          {pending ? 'Guardando…' : service ? 'Guardar' : 'Crear servicio'}
        </Button>
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
      </div>
      {onDelete && (
        <button
          type="button"
          disabled={pending}
          onClick={onDelete}
          className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-label font-bold text-danger-fg"
        >
          <Trash2 size={14} strokeWidth={2.3} />
          Quitar del catálogo
        </button>
      )}
    </div>
  );
}
