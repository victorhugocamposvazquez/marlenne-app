'use client';

import { useState, useTransition } from 'react';
import Sheet, { Field, inputCls, useCloseSheet } from '@/components/Sheet';
import { updateClientRecord } from '@/app/actions/clients';
import type { ClientRow } from '@/lib/types';

export default function EditClientSheet({ client }: { client: ClientRow }) {
  const close = useCloseSheet();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(client.full_name);
  const [phone, setPhone] = useState(client.phone ?? '');
  const [email, setEmail] = useState(client.email ?? '');
  const [notes, setNotes] = useState(client.notes ?? '');
  const [vip, setVip] = useState(client.tags?.includes('VIP') ?? false);
  const [sms, setSms] = useState(client.sms_opt_in);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    startTransition(async () => {
      const tags = (client.tags ?? []).filter(t => t !== 'VIP');
      if (vip) tags.push('VIP');
      const r = await updateClientRecord({
        id: client.id,
        full_name: name,
        phone,
        email,
        notes,
        tags,
        sms_opt_in: sms,
      });
      if (!r.ok) setError(r.error ?? 'No se ha podido guardar');
      else close();
    });
  };

  return (
    <Sheet
      title="Editar ficha"
      subtitle={client.full_name}
      footer={
        <>
          {error && <p className="mb-2 text-[12px] font-semibold text-pink-700">{error}</p>}
          <button
            onClick={save}
            disabled={name.trim().length < 2 || pending}
            className="w-full rounded-field bg-grad py-3.5 text-[15px] font-extrabold text-white shadow-btn disabled:opacity-40"
          >
            {pending ? 'Guardando…' : 'Guardar cambios'}
          </button>
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
      <Field label="Notas">
        <textarea
          className={`${inputCls} min-h-[88px] resize-none`}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </Field>
      <label className="mb-2 flex items-center gap-2 text-[13.5px] font-bold">
        <input type="checkbox" checked={vip} onChange={e => setVip(e.target.checked)} className="h-4 w-4 accent-[#8B5CF6]" />
        VIP
      </label>
      <label className="mb-2 flex items-center gap-2 text-[13.5px] font-bold">
        <input type="checkbox" checked={sms} onChange={e => setSms(e.target.checked)} className="h-4 w-4 accent-[#8B5CF6]" />
        Recibe recordatorios SMS
      </label>
    </Sheet>
  );
}
