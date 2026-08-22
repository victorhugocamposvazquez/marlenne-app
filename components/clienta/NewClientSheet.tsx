'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Sheet, { Field, inputCls, useCloseSheet } from '@/components/Sheet';
import { addConsent, createClientRecord } from '@/app/actions/clients';

export default function NewClientSheet() {
  const close = useCloseSheet();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vip, setVip] = useState(false);
  const [foto, setFoto] = useState(false);
  const [salud, setSalud] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    startTransition(async () => {
      const r = await createClientRecord({
        full_name: name,
        phone: phone || undefined,
        email: email || undefined,
        tags: vip ? ['VIP'] : [],
      });
      if (!r.ok || !r.id) setError(r.error ?? 'No se ha podido guardar');
      else {
        if (foto) await addConsent({ clientId: r.id, kind: 'fotografia' });
        if (salud) await addConsent({ clientId: r.id, kind: 'datos_salud' });
        close();
        router.push(`/clientas/${r.id}`);
      }
    });
  };

  return (
    <Sheet
      title="Nueva clienta"
      subtitle="Ficha mínima. El resto se completa en el tratamiento."
      footer={
        <>
          {error && <p className="mb-2 text-[12px] font-semibold text-pink-700">{error}</p>}
          <button
            onClick={save}
            disabled={name.trim().length < 2 || pending}
            className="w-full rounded-field bg-grad py-3.5 text-[15px] font-extrabold text-white shadow-btn disabled:opacity-40"
          >
            {pending ? 'Guardando…' : 'Crear ficha'}
          </button>
        </>
      }
    >
      <Field label="Nombre">
        <input className={inputCls} autoFocus placeholder="Nombre y apellidos" value={name} onChange={e => setName(e.target.value)} />
      </Field>
      <Field label="Teléfono">
        <input className={inputCls} type="tel" placeholder="+34…" value={phone} onChange={e => setPhone(e.target.value)} />
      </Field>
      <Field label="Email">
        <input className={inputCls} type="email" placeholder="opcional" value={email} onChange={e => setEmail(e.target.value)} />
      </Field>
      <label className="mb-2 flex items-center gap-2 text-[13.5px] font-bold">
        <input type="checkbox" checked={vip} onChange={e => setVip(e.target.checked)} className="h-4 w-4 accent-[#8B5CF6]" />
        Marcar como VIP
      </label>
      <label className="mb-2 flex items-center gap-2 text-[13.5px] font-bold">
        <input type="checkbox" checked={salud} onChange={e => setSalud(e.target.checked)} className="h-4 w-4 accent-[#8B5CF6]" />
        Consentimiento de datos de salud
      </label>
      <label className="mb-2 flex items-center gap-2 text-[13.5px] font-bold">
        <input type="checkbox" checked={foto} onChange={e => setFoto(e.target.checked)} className="h-4 w-4 accent-[#8B5CF6]" />
        Consentimiento de fotografías
      </label>
    </Sheet>
  );
}
