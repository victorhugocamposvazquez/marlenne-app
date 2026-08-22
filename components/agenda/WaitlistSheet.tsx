'use client';

import { useMemo, useState, useTransition } from 'react';
import { CalendarPlus, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Sheet, { Field, inputCls, useCloseSheet } from '@/components/Sheet';
import { addToWaitlist, resolveWaitlist } from '@/app/actions/clients';
import { dateLbl } from '@/lib/time';
import type { ClientOption, ServiceOption, WaitItem } from '@/lib/types';

export default function WaitlistSheet({
  items, clients, services,
}: {
  items: WaitItem[];
  clients: ClientOption[];
  services: ServiceOption[];
}) {
  const close = useCloseSheet();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [client, setClient] = useState<ClientOption | null>(null);
  const [serviceId, setServiceId] = useState('');
  const [preference, setPreference] = useState('');
  const [error, setError] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || client) return [];
    return clients.filter(c => c.full_name.toLowerCase().includes(q)).slice(0, 5);
  }, [query, clients, client]);

  const who = client?.full_name ?? query.trim();

  const save = () => {
    if (who.length < 2) return;
    setError(null);
    startTransition(async () => {
      const r = await addToWaitlist({
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
    <Sheet title="Lista de espera" subtitle={items.length ? `${items.length} pendientes` : 'Nadie esperando ahora'}>
      <div className="mb-3 flex flex-col gap-2">
        {items.map(w => {
          const name = w.client?.full_name ?? w.client_name ?? 'Sin nombre';
          return (
            <div key={w.id} className="rounded-row border border-surface-line bg-white p-3 shadow-card">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-bold">{name}</div>
                  <div className="text-[11.5px] font-medium text-ink-3">
                    {[w.service?.name, w.preference, dateLbl(w.created_at)].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <button
                  disabled={pending}
                  onClick={() => startTransition(() => { void resolveWaitlist(w.id); })}
                  aria-label={`Quitar a ${name} de la espera`}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-emerald-50 text-emerald-700"
                >
                  <Check size={16} strokeWidth={2.4} />
                </button>
              </div>
              <button
                onClick={() => {
                  const qs = new URLSearchParams({ new: '1' });
                  if (w.client_id) qs.set('client', w.client_id);
                  close();
                  router.push(`/agenda?${qs.toString()}`);
                }}
                className="mt-2 flex items-center gap-1.5 text-[12px] font-bold text-v-d"
              >
                <CalendarPlus size={14} strokeWidth={2.2} />
                Dar cita
              </button>
            </div>
          );
        })}
      </div>

      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="mb-2 w-full rounded-field border border-dashed border-handle py-3 text-[13.5px] font-bold text-ink-2"
        >
          Añadir a la espera
        </button>
      ) : (
        <div className="mb-2 rounded-field border border-surface-line bg-surface-bg/40 p-3.5">
          <Field label="Quién">
            {client ? (
              <button onClick={() => setClient(null)} className={`${inputCls} text-left`}>
                {client.full_name}
              </button>
            ) : (
              <>
                <input className={inputCls} placeholder="Nombre o buscar" value={query} onChange={e => setQuery(e.target.value)} />
                {matches.map(c => (
                  <button key={c.id} onClick={() => setClient(c)} className="mt-1 block w-full rounded-[12px] px-3 py-2 text-left text-[13px] font-bold hover:bg-v-tint">
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
          {error && <p className="mb-2 text-[12px] font-semibold text-pink-700">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)} className="flex-1 rounded-field border border-surface-line bg-white py-3 text-[13px] font-bold text-ink-2">
              Cancelar
            </button>
            <button
              disabled={who.length < 2 || pending}
              onClick={save}
              className="flex-1 rounded-field bg-grad py-3 text-[13px] font-extrabold text-white shadow-btn disabled:opacity-40"
            >
              Guardar
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
