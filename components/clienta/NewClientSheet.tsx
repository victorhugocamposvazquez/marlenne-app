'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Sheet, { Field, inputCls } from '@/components/Sheet';
import { useSheetShellClose } from '@/components/SheetShell';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/Toast';
import { addConsent, createClientRecord } from '@/lib/client-write';
import { createClient } from '@/lib/supabase/client';
import { CONSENT_COPY } from '@/lib/consents';
import { fold } from '@/lib/voice';
import type { ClientOption } from '@/lib/types';

function digits(s: string) {
  return s.replace(/\D/g, '');
}

function ExistingMatch({ c }: { c: ClientOption }) {
  const router = useRouter();
  const requestClose = useSheetShellClose();
  return (
    <button
      type="button"
      onClick={() => requestClose(() => router.push(`/agenda?new=1&client=${c.id}`))}
      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left last:pb-2.5"
    >
      <span className="min-w-0">
        <span className="block truncate text-body font-bold">{c.full_name}</span>
        {c.phone && <span className="block text-caption font-medium text-ink-3">{c.phone}</span>}
      </span>
      <span className="shrink-0 text-label font-bold text-v-d">Dar cita</span>
    </button>
  );
}

function NewClientBody({ existing }: { existing: ClientOption[] }) {
  const router = useRouter();
  const toast = useToast();
  const requestClose = useSheetShellClose();
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

  const canSave = name.trim().length >= 2 && !pending;

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
      toast('Ficha creada');
      requestClose(() => {
        if (book) router.push(`/agenda?new=1&client=${r.id}`);
        else router.refresh();
      });
    });
  };

  return (
    <>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (canSave) save(true);
        }}
      >
        <Field label="Nombre">
          <input
            className={inputCls}
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
            <ExistingMatch key={c.id} c={c} />
          ))}
        </div>
      )}

      <div>
        <p className="mb-2.5 text-caption font-bold uppercase tracking-[.03em] text-ink-2">
          Datos y consentimientos
        </p>
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

      <div className="mt-5 border-t border-surface-line pt-4">
        {error && <p className="mb-2 text-label font-semibold text-danger-fg">{error}</p>}
        {dupId ? (
          <Button
            full
            onClick={() => requestClose(() => router.push(`/agenda?new=1&client=${dupId}`))}
          >
            Dar cita a esa ficha
          </Button>
        ) : (
          <>
            <Button full variant="ink" onClick={() => save(true)} disabled={!canSave}>
              {pending ? 'Guardando…' : 'Crear y dar cita'}
            </Button>
            <button
              type="button"
              onClick={() => save(false)}
              disabled={!canSave}
              className="mt-2 flex min-h-[44px] w-full items-center justify-center text-body font-semibold text-ink-2 disabled:opacity-40"
            >
              Solo la ficha
            </button>
          </>
        )}
      </div>
    </>
  );
}

export default function NewClientSheet({ existing = [] }: { existing?: ClientOption[] }) {
  return (
    <Sheet
      title="Nueva Client@"
      subtitle="Nombre y teléfono bastan. Luego das la cita."
      initialHeight="tall"
      floorDetent="tall"
    >
      <NewClientBody existing={existing} />
    </Sheet>
  );
}
