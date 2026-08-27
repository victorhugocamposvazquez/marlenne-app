'use client';

import { useMemo, useState, useTransition } from 'react';
import { CalendarPlus, Check, MessageCircle } from 'lucide-react';
import Sheet, { Field, inputCls } from '@/components/Sheet';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import { addToWaitlist, resolveWaitlist } from '@/lib/agenda-write';
import { createClient } from '@/lib/supabase/client';
import { shallowSet } from '@/hooks/useShallowQuery';
import { dateLbl } from '@/lib/time';
import { firstName, waHref } from '@/lib/phone';
import { fold } from '@/lib/voice';
import type { ClientOption, ServiceOption, WaitItem } from '@/lib/types';

export default function WaitlistSheet({
  items, clients, services,
}: {
  items: WaitItem[];
  clients: ClientOption[];
  services: ServiceOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [client, setClient] = useState<ClientOption | null>(null);
  const [serviceId, setServiceId] = useState('');
  const [preference, setPreference] = useState('');
  const [error, setError] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = fold(query);
    const digits = query.replace(/\D/g, '');
    if ((!q && !digits) || client) return [];
    return clients
      .filter(c => (q && fold(c.full_name).includes(q)) || (digits.length >= 3 && (c.phone ?? '').includes(digits)))
      .slice(0, 5);
  }, [query, clients, client]);

  const who = client?.full_name ?? query.trim();

  const save = () => {
    if (who.length < 2) return;
    setError(null);
    startTransition(async () => {
      const r = await addToWaitlist(createClient(), {
        clientId: client?.id,
        clientName: client ? undefined : who,
        serviceId: serviceId || undefined,
        preference: preference || undefined,
      });
      if (!r.ok) setError(r.error);
      else {
        setAdding(false);
        setQuery('');
        setClient(null);
        setServiceId('');
        setPreference('');
      }
    });
  };

  return (
    <Sheet
      title="Lista de espera"
      subtitle={items.length ? `${items.length} pendientes` : 'Nadie esperando ahora'}
      footer={
        adding ? (
          <>
            {error && <p className="mb-2 text-label font-semibold text-danger-fg">{error}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1 text-ink-2" onClick={() => setAdding(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" disabled={who.length < 2 || pending} onClick={save}>
                Guardar
              </Button>
            </div>
          </>
        ) : (
          <Button
            variant="secondary"
            full
            className="border-dashed !border-handle text-ink-2 shadow-none"
            onClick={() => setAdding(true)}
          >
            Añadir a la espera
          </Button>
        )
      }
    >
      <div className="mb-3 flex flex-col gap-2">
        {items.map(w => {
          const name = w.client?.full_name ?? w.client_name ?? 'Sin nombre';
          const wa = waHref(
            w.client?.phone,
            `Hola ${firstName(name)}, ¿sigues esperando ${w.service?.name ?? 'cita'}? Tenemos un hueco.`,
          );
          return (
            <div key={w.id} className="rounded-row border border-surface-line bg-surface-card p-3 shadow-card">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-body font-bold">{name}</div>
                  <div className="text-caption font-medium text-ink-3">
                    {[w.service?.name, w.preference, dateLbl(w.created_at)].filter(Boolean).join(' · ')}
                  </div>
                  {w.client?.phone && (
                    <div className="mt-0.5 flex flex-wrap gap-2">
                      <a href={`tel:${w.client.phone}`} className="text-label font-bold text-v-d">
                        {w.client.phone}
                      </a>
                      {wa && (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-label font-bold text-ok-fg"
                        >
                          <MessageCircle size={13} strokeWidth={2.2} />
                          WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <IconButton
                  label={`Quitar a ${name} de la espera`}
                  tone="ok"
                  disabled={pending}
                  onClick={() => startTransition(() => { void resolveWaitlist(createClient(), w.id); })}
                >
                  <Check size={17} strokeWidth={2.4} />
                </IconButton>
              </div>
              <button
                onClick={() => {
                  shallowSet({
                    wait: null,
                    new: '1',
                    client: w.client_id ?? null,
                    nombre: w.client_id ? null : (w.client_name ?? null),
                    servicio: w.service?.name ?? null,
                  });
                }}
                className="mt-1 flex min-h-[44px] items-center gap-1.5 text-label font-bold text-v-d"
              >
                <CalendarPlus size={14} strokeWidth={2.2} />
                Dar cita
              </button>
            </div>
          );
        })}
      </div>

      {adding && (
        <div className="mb-2 rounded-field border border-surface-line bg-surface-bg/40 p-3.5">
          <Field label="Quién">
            {client ? (
              <button type="button" onClick={() => setClient(null)} className={`${inputCls} text-left`}>
                {client.full_name}
              </button>
            ) : (
              <>
                <input className={inputCls} placeholder="Nombre o buscar" value={query} onChange={e => setQuery(e.target.value)} />
                {matches.map(c => (
                  <button key={c.id} type="button" onClick={() => setClient(c)} className="mt-1 block w-full rounded-chip px-3 py-2 text-left text-body font-bold hover:bg-v-tint">
                    {c.full_name}
                  </button>
                ))}
              </>
            )}
          </Field>
          <Field label="Servicio">
            <select className={inputCls} value={serviceId} onChange={e => setServiceId(e.target.value)}>
              <option value="">Cualquiera</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Preferencia">
            <input className={inputCls} placeholder="Tardes, esta semana…" value={preference} onChange={e => setPreference(e.target.value)} />
          </Field>
        </div>
      )}
    </Sheet>
  );
}
