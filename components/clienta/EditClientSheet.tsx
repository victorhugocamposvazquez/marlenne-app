'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Sheet, { Field, inputCls, useCloseSheet } from '@/components/Sheet';
import { updateClientRecord } from '@/lib/client-write';
import { createClient } from '@/lib/supabase/client';
import type { ClientRow } from '@/lib/types';

export default function EditClientSheet({ client }: { client: ClientRow }) {
  const close = useCloseSheet();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(client.full_name);
  const [phone, setPhone] = useState(client.phone ?? '');
  const [email, setEmail] = useState(client.email ?? '');
  const [birth, setBirth] = useState(client.birth_date ?? '');
  const [notes, setNotes] = useState(client.notes ?? '');
  const [vip, setVip] = useState(client.tags?.includes('VIP') ?? false);
  const [sms, setSms] = useState(client.sms_opt_in);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    startTransition(async () => {
      const tags = (client.tags ?? []).filter(t => t !== 'VIP');
      if (vip) tags.push('VIP');
      const r = await updateClientRecord(createClient(), {
        id: client.id,
        full_name: name,
        phone,
        email,
        notes,
        tags,
        sms_opt_in: sms,
        birth_date: birth || null,
      });
      if (!r.ok) setError(r.error ?? 'No se ha podido guardar');
      else {
        close();
        router.refresh();
      }
    });
  };

  return (
    <Sheet
      title="Editar ficha"
      subtitle={client.full_name}
      footer={
        <>
          {error && <p className="mb-2 text-label font-semibold text-danger-fg">{error}</p>}
          <Button size="lg" full onClick={save} disabled={name.trim().length < 2 || pending}>
            {pending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </>
      }
    >
      <Field label="Nombre">
        <input className={inputCls} value={name} onChange={e => setName(e.target.value)} />
      </Field>
      <Field label="Teléfono">
        <input className={inputCls} type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
      </Field>
      <Field label="Email">
        <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} />
      </Field>
      <Field label="Fecha de nacimiento">
        <input className={inputCls} type="date" value={birth} onChange={e => setBirth(e.target.value)} />
      </Field>
      <Field label="Notas">
        <textarea
          className={`${inputCls} min-h-[88px] resize-none`}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </Field>
      <label className="mb-2 flex items-center gap-2 text-body font-bold">
        <input type="checkbox" checked={vip} onChange={e => setVip(e.target.checked)} className="h-5 w-5 accent-v" />
        VIP
      </label>
      <label className="mb-2 flex items-center gap-2 text-body font-bold">
        <input type="checkbox" checked={sms} onChange={e => setSms(e.target.checked)} className="h-5 w-5 accent-v" />
        Recibe recordatorios SMS
      </label>
    </Sheet>
  );
}
