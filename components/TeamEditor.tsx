'use client';

import { useState, useTransition } from 'react';
import { updateMember } from '@/app/actions/staff';
import { avatarColor } from '@/lib/categories';
import NewMemberSheet from '@/components/team/NewMemberSheet';
import { Chip, Field, inputCls } from '@/components/Sheet';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/Toast';
import { useShallowParam } from '@/hooks/useShallowQuery';
import type { Provider, StaffRole } from '@/lib/types';

const ROLES: { id: StaffRole; label: string }[] = [
  { id: 'admin', label: 'Dirección' },
  { id: 'reception', label: 'Recepción' },
  { id: 'provider', label: 'Cabina' },
];

const roleLbl = (r: StaffRole) => ROLES.find(x => x.id === r)?.label ?? r;

export default function TeamEditor({
  team, meId, initialMiembro,
}: {
  team: Provider[];
  meId: string;
  initialMiembro?: boolean;
}) {
  const toast = useToast();
  const miembro = useShallowParam('miembro', initialMiembro ? '1' : null);
  const [open, setOpen] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const active = team.filter(p => p.is_active !== false).length;

  return (
    <div>
      <p className="mb-3 text-body font-normal text-ink-2">
        {team.length === active
          ? `${team.length} ${team.length === 1 ? 'persona' : 'personas'}`
          : `${active} activas · ${team.length} en total`}
      </p>

      <div className="flex flex-col gap-2">
        {team.map(p => (
          <div key={p.id} className="rounded-row bg-surface-soft">
            <button
              type="button"
              onClick={() => setOpen(o => o === p.id ? null : p.id)}
              className="flex w-full items-center gap-3 p-3 text-left"
            >
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-icon text-label font-bold text-white"
                style={{ background: p.color ?? avatarColor(p.full_name) }}
              >
                {p.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-body-lg font-bold ${p.is_active === false ? 'text-ink-3 line-through' : ''}`}>
                  {p.full_name}{p.id === meId ? ' · tú' : ''}
                </span>
                <span className="block truncate text-body text-ink-2">
                  {roleLbl(p.role)}{p.job_title ? ` · ${p.job_title}` : ''}
                  {p.is_active === false ? ' · inactiva' : ''}
                </span>
              </span>
            </button>
            {open === p.id && (
              <EditForm
                member={p}
                pending={pending}
                onSave={input => startTransition(async () => {
                  const r = await updateMember({ id: p.id, ...input });
                  if (!r.ok) toast(r.error ?? 'No se ha podido guardar', 'err');
                  else {
                    toast('Equipo actualizado');
                    setOpen(null);
                  }
                })}
              />
            )}
          </div>
        ))}
      </div>
      {miembro === '1' && <NewMemberSheet />}
    </div>
  );
}

function EditForm({
  member, pending, onSave,
}: {
  member: Provider;
  pending: boolean;
  onSave: (i: { full_name: string; role: StaffRole; job_title?: string; is_active: boolean }) => void;
}) {
  const [name, setName] = useState(member.full_name);
  const [title, setTitle] = useState(member.job_title ?? '');
  const [role, setRole] = useState<StaffRole>(member.role);
  const [active, setActive] = useState(member.is_active !== false);

  return (
    <div className="border-t border-surface-line px-3.5 pb-3 pt-2">
      <Field label="Nombre">
        <input className={inputCls} value={name} onChange={e => setName(e.target.value)} />
      </Field>
      <Field label="Puesto">
        <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} />
      </Field>
      <Field label="Rol">
        <div className="flex flex-wrap gap-2">
          {ROLES.map(r => (
            <Chip key={r.id} active={r.id === role} onClick={() => setRole(r.id)}>{r.label}</Chip>
          ))}
        </div>
      </Field>
      <label className="mb-3 flex items-center gap-2.5 text-body font-bold">
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
        Activa en la agenda
      </label>
      <Button
        variant="ink"
        full
        disabled={pending || name.trim().length < 2}
        onClick={() => onSave({ full_name: name, role, job_title: title, is_active: active })}
      >
        {pending ? 'Guardando…' : 'Guardar'}
      </Button>
    </div>
  );
}
