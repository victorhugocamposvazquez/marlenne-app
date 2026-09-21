'use client';

import { useMemo, useState, useTransition } from 'react';
import { updateMember } from '@/app/actions/staff';
import { LocalSheet } from '@/components/Sheet';
import NewMemberSheet from '@/components/team/NewMemberSheet';
import { useToast } from '@/components/Toast';
import { fold } from '@/lib/voice';
import { useShallowParam } from '@/hooks/useShallowQuery';
import type { Provider, StaffRole } from '@/lib/types';
import {
  CatalogGroupCard,
  CatalogRowButton,
  CatalogSearchField,
  PickChip,
  SettingsToggleRow,
  SheetField,
  SheetFooter,
  catalogInputCls,
} from './catalog-ui';

const ROLES: { id: StaffRole; label: string }[] = [
  { id: 'admin', label: 'Dirección' },
  { id: 'reception', label: 'Recepción' },
  { id: 'provider', label: 'Cabina' },
];

const roleLbl = (r: StaffRole) => ROLES.find(x => x.id === r)?.label ?? r;

export default function EquipoAdminView({
  team, meId, initialMiembro,
}: {
  team: Provider[];
  meId: string;
  initialMiembro?: boolean;
}) {
  const toast = useToast();
  const miembro = useShallowParam('miembro', initialMiembro ? '1' : null);
  const [query, setQuery] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const needle = fold(query.trim());

  const groups = useMemo(() => ROLES.map(role => {
    const all = team.filter(p => p.role === role.id);
    const items = all.filter(p => {
      if (!needle) return true;
      const hay = [p.full_name, p.job_title ?? '', roleLbl(p.role)].map(fold).join(' ');
      return hay.includes(needle);
    });
    return { role, items, all };
  }).filter(g => !needle || g.items.length > 0), [team, needle]);

  const editing = team.find(p => p.id === editId) ?? null;

  return (
    <>
      <CatalogSearchField
        value={query}
        onChange={setQuery}
        placeholder="Buscar en el equipo"
      />

      <div className="mt-5 flex flex-col gap-6 pb-2">
        {groups.map(({ role, items, all }) => (
          <section key={role.id}>
            <div className="mb-2.5 flex items-center gap-2.5 px-1">
              <div className="flex min-w-0 flex-1 items-center gap-2 py-1.5">
                <span className="truncate text-body-lg font-bold tracking-[-.01em] text-ink">
                  {role.label}
                </span>
                <span className="text-label font-semibold text-ink-3">{all.length}</span>
              </div>
            </div>
            <CatalogGroupCard>
              {items.length === 0 ? (
                <p className="px-3.5 py-4 text-label font-medium text-ink-3">Nadie en este rol.</p>
              ) : (
                items.map(p => (
                  <CatalogRowButton
                    key={p.id}
                    onClick={() => setEditId(p.id)}
                    title={`${p.full_name}${p.id === meId ? ' · tú' : ''}`}
                    meta={[p.job_title, p.is_active === false ? 'inactiva' : null].filter(Boolean).join(' · ') || roleLbl(p.role)}
                    muted={p.is_active === false}
                  />
                ))
              )}
            </CatalogGroupCard>
          </section>
        ))}
      </div>

      {editing && (
        <MemberSheet
          key={editing.id}
          open
          member={editing}
          pending={pending}
          onClose={() => setEditId(null)}
          onSave={input => startTransition(async () => {
            const r = await updateMember({ id: editing.id, ...input });
            if (!r.ok) toast(r.error ?? 'No se ha podido guardar', 'err');
            else {
              toast('Equipo actualizado');
              setEditId(null);
            }
          })}
        />
      )}

      {miembro === '1' && <NewMemberSheet />}
    </>
  );
}

function MemberSheet({
  open, member, pending, onClose, onSave,
}: {
  open: boolean;
  member: Provider;
  pending: boolean;
  onClose: () => void;
  onSave: (i: { full_name: string; role: StaffRole; job_title?: string; is_active: boolean }) => void;
}) {
  const [name, setName] = useState(member.full_name);
  const [title, setTitle] = useState(member.job_title ?? '');
  const [role, setRole] = useState<StaffRole>(member.role);
  const [active, setActive] = useState(member.is_active !== false);
  const canSave = name.trim().length >= 2;

  return (
    <LocalSheet
      open={open}
      onClose={onClose}
      title="Editar persona"
      initialHeight="tall"
      floorDetent="tall"
      footer={
        <SheetFooter
          pending={pending}
          canSave={canSave}
          saveLabel="Guardar cambios"
          onCancel={onClose}
          onSave={() => onSave({
            full_name: name.trim(),
            role,
            job_title: title.trim() || undefined,
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
          />
        </SheetField>
        <SheetField label="Puesto">
          <input
            className={`${catalogInputCls} h-[54px]`}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Esteticista · corporal"
          />
        </SheetField>
        <div className="flex flex-col gap-2">
          <span className="text-label font-semibold text-ink-2">Rol</span>
          <div className="flex flex-wrap gap-2">
            {ROLES.map(r => (
              <PickChip key={r.id} active={r.id === role} onClick={() => setRole(r.id)}>
                {r.label}
              </PickChip>
            ))}
          </div>
        </div>
        <SettingsToggleRow
          title="Activa en la agenda"
          hint="Si la desactivas, no aparece en columnas ni en nuevas citas."
          on={active}
          onToggle={() => setActive(a => !a)}
        />
      </div>
    </LocalSheet>
  );
}
