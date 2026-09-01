'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarPlus, Users } from 'lucide-react';
import { Field, inputCls } from '@/components/Sheet';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import EmptyState from '@/components/ui/EmptyState';
import { loadClientOptions } from '@/lib/agenda-catalog';
import { draftFromTemplate, packExpired, packIsOpen } from '@/lib/packs';
import { sellPack, setPackFriend } from '@/lib/pack-write';
import { createClient } from '@/lib/supabase/client';
import { dateLbl } from '@/lib/time';
import { fold } from '@/lib/voice';
import type { ClientOption, ClientPack, PackTemplate, ServiceOption } from '@/lib/types';

export default function PacksCard({
  clientId, clientName, packs, templates, services, canEdit,
}: {
  clientId: string;
  clientName: string;
  packs: ClientPack[];
  templates: PackTemplate[];
  services: ServiceOption[];
  canEdit: boolean;
}) {
  const [selling, setSelling] = useState(false);
  const open = packs.filter(p => packIsOpen(p));
  const closed = packs.filter(p => !packIsOpen(p));

  return (
    <section className="mt-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-body font-extrabold uppercase tracking-[.04em] text-ink-2">Bonos</h2>
        {canEdit && !selling && (
          <button
            type="button"
            onClick={() => setSelling(true)}
            className="text-label font-bold text-v-d"
          >
            Vender bono
          </button>
        )}
      </div>

      {selling && (
        <SellForm
          clientId={clientId}
          templates={templates.filter(t => t.is_active)}
          services={services}
          onClose={() => setSelling(false)}
        />
      )}

      {packs.length === 0 && !selling && (
        <EmptyState
          title="Sin bonos"
          hint="Un bono de 6 láser o un pack amigo se venden aquí, no en el tratamiento clínico."
        />
      )}

      <div className="flex flex-col gap-2">
        {open.map(p => (
          <PackRow
            key={p.id}
            pack={p}
            clientId={clientId}
            clientName={clientName}
            canEdit={canEdit}
          />
        ))}
        {closed.map(p => (
          <PackRow
            key={p.id}
            pack={p}
            clientId={clientId}
            clientName={clientName}
            canEdit={false}
            muted
          />
        ))}
      </div>
    </section>
  );
}

function PackRow({
  pack, clientId, clientName, canEdit, muted,
}: {
  pack: ClientPack;
  clientId: string;
  clientName: string;
  canEdit: boolean;
  muted?: boolean;
}) {
  const router = useRouter();
  const isOwner = pack.owner_client_id === clientId;
  const expired = packExpired(pack.expires_at);
  const pct = Math.min(100, Math.round((100 * (pack.sessions_done + pack.reserved)) / pack.sessions_total));
  const [friendOpen, setFriendOpen] = useState(false);

  return (
    <article className={`rounded-row border border-surface-line bg-surface-card p-3.5 shadow-card ${muted ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-body font-bold">{pack.name}</h3>
          <p className="mt-0.5 text-caption font-medium text-ink-3">
            {[
              pack.service_name ?? 'Cualquier servicio',
              pack.price_cents ? `${(pack.price_cents / 100).toFixed(0)} €` : null,
              pack.expires_at ? (expired ? `caducó ${dateLbl(pack.expires_at)}` : `hasta ${dateLbl(pack.expires_at)}`) : null,
            ].filter(Boolean).join(' · ')}
          </p>
        </div>
        {pack.friend_client_id && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-badge bg-v-soft px-2 py-1 text-micro font-bold text-v-d">
            <Users size={11} strokeWidth={2.4} />
            Pack amigo
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <div className="h-1.5 flex-1 overflow-hidden rounded bg-surface-line">
          <div className="h-1.5 rounded bg-grad" style={{ width: `${pct}%` }} />
        </div>
        <span className="shrink-0 text-caption font-bold tabular-nums text-ink-2">
          {pack.remaining} de {pack.sessions_total}
        </span>
      </div>
      {pack.reserved > 0 && (
        <p className="mt-1 text-micro font-semibold text-ink-3">
          {pack.reserved === 1 ? '1 cita agendada' : `${pack.reserved} citas agendadas`} sin marcar hecha
        </p>
      )}

      <p className="mt-2 text-caption font-medium text-ink-2">
        {isOwner
          ? (pack.friend_name ? `Compartido con ${pack.friend_name}` : 'Solo ella')
          : `De ${pack.owner_name} · lo usa ${clientName}`}
      </p>

      {canEdit && isOwner && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <Link
            href={`/agenda?new=1&client=${clientId}${pack.service_name ? `&servicio=${encodeURIComponent(pack.service_name)}` : ''}`}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-label font-bold text-v-d"
          >
            <CalendarPlus size={14} strokeWidth={2.2} />
            Usar sesión
          </Link>
          <button
            type="button"
            onClick={() => setFriendOpen(o => !o)}
            className="inline-flex min-h-[44px] items-center text-label font-bold text-ink-2"
          >
            {pack.friend_client_id ? 'Cambiar amiga' : 'Hacer pack amigo'}
          </button>
        </div>
      )}

      {friendOpen && canEdit && isOwner && (
        <FriendPicker
          ownerId={clientId}
          currentId={pack.friend_client_id}
          onPick={async id => {
            const r = await setPackFriend(createClient(), pack.id, id);
            if (r.ok) {
              setFriendOpen(false);
              router.refresh();
            }
          }}
        />
      )}
    </article>
  );
}

function FriendPicker({
  ownerId, currentId, onPick,
}: {
  ownerId: string;
  currentId: string | null;
  onPick: (id: string | null) => Promise<void>;
}) {
  const [q, setQ] = useState('');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void loadClientOptions(createClient()).then(setClients);
  }, []);

  const matches = useMemo(() => {
    const n = fold(q);
    if (n.length < 2) return [];
    return clients
      .filter(c => c.id !== ownerId && fold(c.full_name).includes(n))
      .slice(0, 6);
  }, [clients, q, ownerId]);

  return (
    <div className="mt-2 rounded-field border border-surface-line bg-surface-bg/40 p-2.5">
      <input
        className={inputCls}
        placeholder="Nombre de la otra clienta"
        value={q}
        onChange={e => setQ(e.target.value)}
        aria-label="Buscar clienta para pack amigo"
      />
      {matches.map(c => (
        <button
          key={c.id}
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => onPick(c.id))}
          className="mt-1 flex w-full rounded-chip px-2 py-2 text-left text-body font-bold hover:bg-v-tint"
        >
          {c.full_name}
          {c.phone ? <span className="ml-2 font-medium text-ink-3">{c.phone}</span> : null}
        </button>
      ))}
      {currentId && (
        <button
          type="button"
          disabled={pending}
          className="mt-1 text-label font-bold text-danger-fg"
          onClick={() => startTransition(() => onPick(null))}
        >
          Quitar pack amigo
        </button>
      )}
    </div>
  );
}

function SellForm({
  clientId, templates, services, onClose,
}: {
  clientId: string;
  templates: PackTemplate[];
  services: ServiceOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const chosen = templates.find(t => t.id === templateId);
  const [name, setName] = useState(chosen?.name ?? '');
  const [serviceId, setServiceId] = useState(chosen?.service_id ?? '');
  const [sessions, setSessions] = useState(String(chosen?.sessions_total ?? 6));
  const [used, setUsed] = useState('0');
  const [euros, setEuros] = useState(String((chosen?.price_cents ?? 0) / 100));
  const [days, setDays] = useState(chosen?.valid_days ? String(chosen.valid_days) : '');
  const [friendId, setFriendId] = useState<string | null>(null);
  const [friendName, setFriendName] = useState('');
  const [friendOpen, setFriendOpen] = useState(false);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find(x => x.id === id);
    if (!t) {
      setName('');
      setServiceId('');
      setSessions('6');
      setEuros('0');
      setDays('');
      return;
    }
    const d = draftFromTemplate(t);
    setName(d.name);
    setServiceId(d.service_id ?? '');
    setSessions(String(d.sessions_total));
    setEuros(String(d.price_cents / 100));
    setDays(d.valid_days ? String(d.valid_days) : '');
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      const r = await sellPack(createClient(), {
        ownerClientId: clientId,
        templateId: templateId || null,
        name,
        serviceId: serviceId || null,
        sessionsTotal: Number(sessions),
        sessionsDone: Number(used) || 0,
        priceCents: Math.round(Number(euros.replace(',', '.')) * 100) || 0,
        validDays: days.trim() ? Number(days) : null,
        friendClientId: friendId,
      });
      if (!r.ok) setError(r.error ?? 'No se ha podido vender');
      else {
        onClose();
        router.refresh();
      }
    });
  };

  return (
    <div className="mb-2 rounded-row border border-v/25 bg-v-tint/50 p-3.5">
      <Field label="Del catálogo">
        <select className={inputCls} value={templateId} onChange={e => applyTemplate(e.target.value)}>
          <option value="">Otro, a mano</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>{t.name} · {t.sessions_total} ses.</option>
          ))}
        </select>
      </Field>
      <Field label="Nombre">
        <input className={inputCls} value={name} onChange={e => setName(e.target.value)} />
      </Field>
      <Field label="Servicio">
        <select className={inputCls} value={serviceId} onChange={e => setServiceId(e.target.value)}>
          <option value="">Cualquier servicio</option>
          {services.filter(s => s.is_active !== false).map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </Field>
      <div className="mb-3.5 grid grid-cols-2 gap-2">
        <label>
          <span className="mb-1.5 block text-caption font-bold uppercase tracking-[.03em] text-ink-2">Sesiones</span>
          <input className={inputCls} inputMode="numeric" value={sessions} onChange={e => setSessions(e.target.value)} />
        </label>
        <label>
          <span className="mb-1.5 block text-caption font-bold uppercase tracking-[.03em] text-ink-2">Ya usadas</span>
          <input className={inputCls} inputMode="numeric" value={used} onChange={e => setUsed(e.target.value)} />
        </label>
        <label>
          <span className="mb-1.5 block text-caption font-bold uppercase tracking-[.03em] text-ink-2">Precio €</span>
          <input className={inputCls} inputMode="decimal" value={euros} onChange={e => setEuros(e.target.value)} />
        </label>
        <label>
          <span className="mb-1.5 block text-caption font-bold uppercase tracking-[.03em] text-ink-2">Caduca (días)</span>
          <input className={inputCls} inputMode="numeric" placeholder="No" value={days} onChange={e => setDays(e.target.value)} />
        </label>
      </div>
      <div className="mb-3">
        <div className="mb-1.5 text-caption font-bold uppercase tracking-[.03em] text-ink-2">Pack amigo</div>
        {friendId ? (
          <div className="flex items-center justify-between gap-2 rounded-field border border-surface-line bg-surface-card px-3 py-2.5">
            <span className="text-body font-bold">{friendName}</span>
            <button type="button" className="text-label font-bold text-ink-2" onClick={() => { setFriendId(null); setFriendName(''); }}>
              Quitar
            </button>
          </div>
        ) : (
          <Chip active={friendOpen} onClick={() => setFriendOpen(o => !o)}>Compartir con otra clienta</Chip>
        )}
        {friendOpen && !friendId && (
          <FriendPicker
            ownerId={clientId}
            currentId={null}
            onPick={async id => {
              if (!id) return;
              const list = await loadClientOptions(createClient());
              const hit = list.find(c => c.id === id);
              setFriendId(id);
              setFriendName(hit?.full_name ?? '');
              setFriendOpen(false);
            }}
          />
        )}
      </div>
      {error && <p className="mb-2 text-label font-semibold text-danger-fg">{error}</p>}
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button className="flex-1" disabled={pending} onClick={save}>
          {pending ? 'Guardando…' : 'Vender bono'}
        </Button>
      </div>
    </div>
  );
}
