'use client';

import { useState, useTransition } from 'react';
import { createMember, updateMember } from '@/app/actions/staff';
import { avatarColor } from '@/lib/categories';
import { Chip, Field, inputCls } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import type { Provider, StaffRole } from '@/lib/types';

const ROLES: { id: StaffRole; label: string }[] = [
  { id: 'admin', label: 'Dirección' },
  { id: 'reception', label: 'Recepción' },
  { id: 'provider', label: 'Cabina' },
];

const roleLbl = (r: StaffRole) => ROLES.find(x => x.id === r)?.label ?? r;

export default function TeamEditor({ team, meId }: { team: Provider[]; meId: string }) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [created, setCreated] = useState<{ name: string; email: string; password: string } | null>(null);

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[13px] font-extrabold uppercase tracking-[.04em] text-ink-3">Equipo</h2>
        <button
          type="button"
          onClick={() => { setAdding(a => !a); setCreated(null); }}
          className="rounded-[10px] bg-v-soft px-2.5 py-1 text-[11.5px] font-bold text-v-d"
        >
          {adding ? 'Cerrar' : 'Añadir'}
        </button>
      </div>

      {created && (
        <p className="mb-2.5 rounded-row border border-emerald-200 bg-emerald-50 p-3 text-[12.5px] font-semibold leading-snug text-emerald-800">
          {created.name} ya puede entrar con <span className="font-extrabold">{created.email}</span>.
          Contraseña temporal: <span className="font-extrabold tabular-nums">{created.password}</span>
        </p>
      )}

      {adding && (
        <AddForm
          pending={pending}
          onSave={input => startTransition(async () => {
            const r = await createMember(input);
            if (!r.ok || !r.password) toast(r.error ?? 'No se ha podido crear', 'err');
            else {
              setCreated({ name: input.full_name, email: input.email, password: r.password });
              setAdding(false);
            }
          })}
        />
      )}

      <div className="flex flex-col gap-2">
        {team.map(p => (
          <div key={p.id} className="rounded-row border border-surface-line bg-white shadow-card">
            <button
              type="button"
              onClick={() => setOpen(o => o === p.id ? null : p.id)}
              className="flex w-full items-center gap-3 p-3 text-left"
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] text-[11px] font-bold text-white"
                style={{ background: p.color ?? avatarColor(p.full_name) }}
              >
                {p.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-[14px] font-bold ${p.is_active === false ? 'text-ink-3 line-through' : ''}`}>
                  {p.full_name}{p.id === meId ? ' · tú' : ''}
                </span>
                <span className="block truncate text-[11.5px] font-medium text-ink-3">
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
    </div>
  );
}

function AddForm({
  pending, onSave,
}: {
  pending: boolean;
  onSave: (i: { email: string; full_name: string; role: StaffRole; job_title?: string }) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [role, setRole] = useState<StaffRole>('provider');

  return (
    <div className="mb-3 rounded-row border border-surface-line bg-white p-3.5 shadow-card">
      <Field label="Nombre">
        <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Nombre y apellidos" />
      </Field>
      <Field label="Email de acceso">
        <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ana@marlenne.es" />
      </Field>
      <Field label="Puesto">
        <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="Esteticista · corporal" />
      </Field>
      <Field label="Rol">
        <div className="flex flex-wrap gap-2">
          {ROLES.map(r => (
            <Chip key={r.id} active={r.id === role} onClick={() => setRole(r.id)}>{r.label}</Chip>
          ))}
        </div>
      </Field>
      <button
        disabled={pending || name.trim().length < 2 || !email.includes('@')}
        onClick={() => onSave({ email, full_name: name, role, job_title: title })}
        className="w-full rounded-field bg-grad py-3 text-[13.5px] font-extrabold text-white disabled:opacity-40"
      >
        {pending ? 'Creando…' : 'Crear acceso'}
      </button>
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
      <label className="mb-3 flex items-center gap-2 text-[13px] font-bold">
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="h-4 w-4 accent-[#8B5CF6]" />
        Activa en la agenda
      </label>
      <button
        disabled={pending || name.trim().length < 2}
        onClick={() => onSave({ full_name: name, role, job_title: title, is_active: active })}
        className="w-full rounded-field bg-grad py-2.5 text-[13px] font-extrabold text-white disabled:opacity-40"
      >
        {pending ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  );
}
