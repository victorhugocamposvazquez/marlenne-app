'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Sheet, { Field, inputCls, useCloseSheet } from '@/components/Sheet';
import { addConsent, createClientRecord } from '@/lib/client-write';
import { createClient } from '@/lib/supabase/client';
import { CONSENT_COPY } from '@/lib/consents';
import { fold } from '@/lib/voice';
import type { ClientOption } from '@/lib/types';

function digits(s: string) {
  return s.replace(/\D/g, '');
}

export default function NewClientSheet({ existing = [] }: { existing?: ClientOption[] }) {
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
  const [dupId, setDupId] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = fold(name);
    const tel = digits(phone);
    if (q.length < 3 && tel.length < 6) return [];
    return existing
      .filter(c => {
        const sameName = q.length >= 3 && fold(c.full_name).includes(q);
        const samePhone = tel.length >= 6 && digits(c.phone ?? '').endsWith(tel.slice(-9));
        return sameName || samePhone;
      })
      .slice(0, 4);
  }, [name, phone, existing]);

  const save = (book: boolean) => {
    setError(null);
    setDupId(null);
    startTransition(async () => {
      const sb = createClient();
      const r = await createClientRecord(sb, {
        full_name: name,
        phone: phone || undefined,
        email: email || undefined,
        tags: vip ? ['VIP'] : [],
      });
      if (!r.ok || !r.id) {
        setError(r.error ?? 'No se ha podido guardar');
        setDupId(r.id ?? null);
        return;
      }
      if (foto) await addConsent(sb, { clientId: r.id, kind: 'fotografia' });
      if (salud) await addConsent(sb, { clientId: r.id, kind: 'datos_salud' });
      close();
      router.push(book ? `/agenda?new=1&client=${r.id}` : `/clientas/${r.id}`);
    });
  };

  return (
    <Sheet
      title="Nueva clienta"
      subtitle="Nombre y teléfono bastan. Luego das la cita."
      footer={
        <>
          {error && <p className="mb-2 text-[12px] font-semibold text-pink-700">{error}</p>}
          {dupId ? (
            <button
              type="button"
              onClick={() => {
                close();
                router.push(`/agenda?new=1&client=${dupId}`);
              }}
              className="w-full rounded-field bg-grad py-3.5 text-[15px] font-extrabold text-white shadow-btn"
            >
              Dar cita a esa ficha
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => save(true)}
                disabled={name.trim().length < 2 || pending}
                className="w-full rounded-field bg-grad py-3.5 text-[15px] font-extrabold text-white shadow-btn disabled:opacity-40"
              >
                {pending ? 'Guardando…' : 'Crear y dar cita'}
              </button>
              <button
                type="button"
                onClick={() => save(false)}
                disabled={name.trim().length < 2 || pending}
                className="mt-2 w-full py-2 text-[13px] font-bold text-ink-2 disabled:opacity-40"
              >
                Solo la ficha
              </button>
            </>
          )}
        </>
      }
    >
      <form
        onSubmit={e => {
          e.preventDefault();
          if (name.trim().length >= 2 && !pending) save(true);
        }}
      >
        <Field label="Nombre">
          <input
            className={inputCls}
            autoFocus
            placeholder="Nombre y apellidos"
            value={name}
            onChange={e => setName(e.target.value)}
            autoComplete="name"
          />
        </Field>
        <Field label="Teléfono">
          <input
            className={inputCls}
            type="tel"
            inputMode="tel"
            placeholder="612 480 331"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </Field>
      </form>

      {matches.length > 0 && (
        <div className="mb-3.5 overflow-hidden rounded-field border border-amber-200 bg-amber-50">
          <p className="px-3 pt-2 text-[11px] font-bold uppercase tracking-[.03em] text-amber-800">
            ¿Ya está en la base?
          </p>
          {matches.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                close();
                router.push(`/agenda?new=1&client=${c.id}`);
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left last:pb-2.5"
            >
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-bold">{c.full_name}</span>
                {c.phone && <span className="block text-[11px] font-medium text-ink-3">{c.phone}</span>}
              </span>
              <span className="shrink-0 text-[12px] font-bold text-v-d">Dar cita</span>
            </button>
          ))}
        </div>
      )}

      <details className="mb-2">
        <summary className="cursor-pointer text-[12.5px] font-bold text-ink-3">Más datos y consentimientos</summary>
        <div className="mt-2.5">
          <Field label="Email">
            <input className={inputCls} type="email" placeholder="opcional" value={email} onChange={e => setEmail(e.target.value)} />
          </Field>
          <label className="mb-2 flex items-center gap-2 text-[13.5px] font-bold">
            <input type="checkbox" checked={vip} onChange={e => setVip(e.target.checked)} className="h-4 w-4 accent-[#8B5CF6]" />
            Marcar como VIP
          </label>
          <label className="mb-2 flex items-start gap-2 text-[13.5px] font-bold">
            <input type="checkbox" checked={salud} onChange={e => setSalud(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#8B5CF6]" />
            <span>
              Consentimiento de datos de salud
              <span className="mt-0.5 block text-[11.5px] font-medium leading-snug text-ink-3">
                {CONSENT_COPY.datos_salud}
              </span>
            </span>
          </label>
          <label className="mb-2 flex items-start gap-2 text-[13.5px] font-bold">
            <input type="checkbox" checked={foto} onChange={e => setFoto(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#8B5CF6]" />
            <span>
              Consentimiento de fotografías
              <span className="mt-0.5 block text-[11.5px] font-medium leading-snug text-ink-3">
                {CONSENT_COPY.fotografia}
              </span>
            </span>
          </label>
        </div>
      </details>
    </Sheet>
  );
}
