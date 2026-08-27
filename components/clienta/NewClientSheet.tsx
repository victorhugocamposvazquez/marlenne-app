'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Sheet, { Field, inputCls, useCloseSheet } from '@/components/Sheet';
import Button from '@/components/ui/Button';
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
          {error && <p className="mb-2 text-label font-semibold text-danger-fg">{error}</p>}
          {dupId ? (
            <Button
              size="lg"
              full
              onClick={() => {
                close();
                router.push(`/agenda?new=1&client=${dupId}`);
              }}
            >
              Dar cita a esa ficha
            </Button>
          ) : (
            <>
              <Button size="lg" full onClick={() => save(true)} disabled={name.trim().length < 2 || pending}>
                {pending ? 'Guardando…' : 'Crear y dar cita'}
              </Button>
              <Button
                variant="ghost"
                full
                className="mt-1 text-ink-2"
                onClick={() => save(false)}
                disabled={name.trim().length < 2 || pending}
              >
                Solo la ficha
              </Button>
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
        <div className="mb-3.5 overflow-hidden rounded-field border border-warn-line bg-warn-bg">
          <p className="px-3 pt-2 text-caption font-bold uppercase tracking-[.03em] text-warn-fg">
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
                <span className="block truncate text-body font-bold">{c.full_name}</span>
                {c.phone && <span className="block text-caption font-medium text-ink-3">{c.phone}</span>}
              </span>
              <span className="shrink-0 text-label font-bold text-v-d">Dar cita</span>
            </button>
          ))}
        </div>
      )}

      <details className="mb-2">
        <summary className="cursor-pointer text-label font-bold text-ink-3">Más datos y consentimientos</summary>
        <div className="mt-2.5">
          <Field label="Email">
            <input className={inputCls} type="email" placeholder="opcional" value={email} onChange={e => setEmail(e.target.value)} />
          </Field>
          <label className="mb-2 flex items-center gap-2 text-body font-bold">
            <input type="checkbox" checked={vip} onChange={e => setVip(e.target.checked)} className="h-5 w-5 accent-v" />
            Marcar como VIP
          </label>
          <label className="mb-2 flex items-start gap-2 text-body font-bold">
            <input type="checkbox" checked={salud} onChange={e => setSalud(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-v" />
            <span>
              Consentimiento de datos de salud
              <span className="mt-0.5 block text-caption font-medium leading-snug text-ink-3">
                {CONSENT_COPY.datos_salud}
              </span>
            </span>
          </label>
          <label className="mb-2 flex items-start gap-2 text-body font-bold">
            <input type="checkbox" checked={foto} onChange={e => setFoto(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-v" />
            <span>
              Consentimiento de fotografías
              <span className="mt-0.5 block text-caption font-medium leading-snug text-ink-3">
                {CONSENT_COPY.fotografia}
              </span>
            </span>
          </label>
        </div>
      </details>
    </Sheet>
  );
}
