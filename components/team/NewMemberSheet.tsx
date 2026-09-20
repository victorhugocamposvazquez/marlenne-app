'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createMember } from '@/app/actions/staff';
import Sheet, { Chip, Field, inputCls } from '@/components/Sheet';
import { useSheetShellClose } from '@/components/SheetShell';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/Toast';
import type { StaffRole } from '@/lib/types';

const ROLES: { id: StaffRole; label: string }[] = [
  { id: 'admin', label: 'Dirección' },
  { id: 'reception', label: 'Recepción' },
  { id: 'provider', label: 'Cabina' },
];

const roleLbl = (r: StaffRole) => ROLES.find(x => x.id === r)?.label ?? r;

function NewMemberBody() {
  const router = useRouter();
  const toast = useToast();
  const requestClose = useSheetShellClose();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [role, setRole] = useState<StaffRole>('provider');

  const canSave = name.trim().length >= 2 && email.includes('@') && !pending;

  const save = () => {
    startTransition(async () => {
      const input = { email, full_name: name.trim(), role, job_title: title.trim() || undefined };
      const r = await createMember(input);
      if (!r.ok || !r.password) {
        toast(r.error ?? 'No se ha podido crear', 'err');
        return;
      }
      toast('', {
        miembro: {
          name: input.full_name,
          email: input.email,
          role: roleLbl(input.role),
          password: r.password,
        },
      });
      requestClose(() => router.refresh());
    });
  };

  return (
    <>
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
      <div className="mt-5 border-t border-surface-line pt-4">
        <Button variant="ink" full disabled={!canSave} onClick={save}>
          {pending ? 'Creando…' : 'Crear acceso'}
        </Button>
      </div>
    </>
  );
}

export default function NewMemberSheet() {
  return (
    <Sheet
      title="Nueva persona"
      subtitle="Email y rol. Le das la contraseña temporal al entrar."
      initialHeight="tall"
      floorDetent="tall"
    >
      <NewMemberBody />
    </Sheet>
  );
}
