'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useShallowParam } from '@/hooks/useShallowQuery';
import { linkLeadToClient } from '@/app/actions/leads';
import { loadSimilarClients } from '@/app/actions/client-list';
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

function NewClientBody() {
  const router = useRouter();
  const toast = useToast();
  const requestClose = useSheetShellClose();
  const preset = useShallowParam('nombre');
  const presetTel = useShallowParam('tel');
  const presetEmail = useShallowParam('email');
  const fromLead = useShallowParam('fromLead');
  const filled = useRef(false);
  const filledTel = useRef(false);
  const filledEmail = useRef(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vip, setVip] = useState(false);
  const [foto, setFoto] = useState(false);
  const [salud, setSalud] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dupId, setDupId] = useState<string | null>(null);
  const [matches, setMatches] = useState<ClientOption[]>([]);

  useEffect(() => {
    if (filled.current || !preset) return;
    filled.current = true;
    setName(preset);
  }, [preset]);

  useEffect(() => {
    if (filledTel.current || !presetTel) return;
    filledTel.current = true;
    setPhone(presetTel);
  }, [presetTel]);

  useEffect(() => {
    if (filledEmail.current || !presetEmail) return;
    filledEmail.current = true;
    setEmail(presetEmail);
  }, [presetEmail]);

  const matchKey = useMemo(() => `${fold(name)}|${digits(phone)}`, [name, phone]);

  useEffect(() => {
    const q = fold(name);
    const tel = digits(phone);
    if (q.length < 3 && tel.length < 6) {
      setMatches([]);
      return;
    }
    let alive = true;
    const t = window.setTimeout(() => {
      loadSimilarClients(name, phone).then(rows => {
        if (alive) setMatches(rows.slice(0, 4));
      });
    }, 220);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [matchKey, name, phone]);

  const canSave = name.trim().length >= 2 && !pending;

  const save = (book: boolean) => {
    setError(null);
    setDupId(null);
    startTransition(async () => {
      const sb = createClient();
      const tags = [...(vip ? ['VIP'] : []), ...(fromLead ? ['Lead'] : [])];
      const r = await createClientRecord(sb, {
        full_name: name,
        phone: phone || undefined,
        email: email || undefined,
        tags,
      });
      if (!r.ok || !r.id) {
        setError(r.error ?? 'No se ha podido guardar');
        setDupId(r.id ?? null);
        return;
      }
      if (fromLead) {
        const link = await linkLeadToClient(fromLead, r.id);
        if (!link.ok) {
          setError(link.error ?? 'Ficha creada pero no se enlazó el lead');
          return;
        }
      }
      if (foto) await addConsent(sb, { clientId: r.id, kind: 'fotografia' });
      if (salud) await addConsent(sb, { clientId: r.id, kind: 'datos_salud' });
      toast(fromLead ? 'Lead pasado a clienta' : 'Ficha creada');
      requestClose(() => {
        if (fromLead) {
          router.refresh();
          return;
        }
        if (book) router.push(`/agenda?new=1&client=${r.id}`);
        else router.refresh();
      });
    });
  };

  return (
    <>
      <form
        autoComplete="off"
        onSubmit={e => {
          e.preventDefault();
          if (canSave) save(fromLead ? false : true);
        }}
      >
        <Field label="Nombre">
          <input
            className={inputCls}
            name="client-full-name"
            placeholder="Nombre y apellidos"
            value={name}
            onChange={e => setName(e.target.value)}
            autoComplete="off"
          />
        </Field>
        <Field label="Teléfono">
          <input
            className={inputCls}
            name="client-phone"
            type="text"
            inputMode="tel"
            placeholder="612 480 331"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            autoComplete="off"
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
          <input
            className={inputCls}
            name="client-email"
            type="text"
            inputMode="email"
            placeholder="opcional"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="off"
          />
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
            <Button full onClick={() => save(fromLead ? false : true)} disabled={!canSave}>
              {pending
                ? 'Guardando…'
                : fromLead
                  ? 'Guardar como clienta'
                  : 'Crear y dar cita'}
            </Button>
            {!fromLead && (
              <button
                type="button"
                onClick={() => save(false)}
                disabled={!canSave}
                className="mt-2 flex min-h-[44px] w-full items-center justify-center text-body font-semibold text-ink-2 disabled:opacity-40"
              >
                Solo la ficha
              </button>
            )}
            {fromLead && (
              <button
                type="button"
                onClick={() => save(true)}
                disabled={!canSave}
                className="mt-2 flex min-h-[44px] w-full items-center justify-center text-body font-semibold text-ink-2 disabled:opacity-40"
              >
                Guardar y dar cita
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}

function NewClientSheetFrame() {
  const fromLead = useShallowParam('fromLead');
  return (
    <Sheet
      title={fromLead ? 'Pasar a clienta' : 'Nueva Client@'}
      subtitle={fromLead ? 'Revisa nombre y teléfono antes de guardar.' : 'Nombre y teléfono bastan. Luego das la cita.'}
      initialHeight="tall"
      floorDetent="tall"
    >
      <NewClientBody />
    </Sheet>
  );
}

export default function NewClientSheet() {
  return <NewClientSheetFrame />;
}
