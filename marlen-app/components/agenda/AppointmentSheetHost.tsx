'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NewAppointmentSheetBody } from '@/components/agenda/NewAppointmentSheet';
import AppointmentSheet from '@/components/agenda/AppointmentSheet';
import { PUSH_OPEN, armPushOpen } from '@/hooks/push-open';
import { useCloseSheet } from '@/components/Sheet';
import SheetShell from '@/components/SheetShell';
import { loadClientPickerById, loadClientPickerInitial } from '@/app/actions/client-list';
import { loadSalonPacks, loadServiceCounts, loadServices } from '@/lib/agenda-catalog';
import { createClient } from '@/lib/supabase/client';
import { APPT_SELECT, APPT_SELECT_CORE, mapAppt } from '@/lib/agenda-appt';
import { useShallowParam } from '@/hooks/useShallowQuery';
import { dayKey, offsetFromDay } from '@/lib/time';
import type { AgendaAppt, ClientOption, ClientPack, Provider, ServiceOption } from '@/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

function SheetLoading() {
  return (
    <div className="flex flex-1 items-center justify-center pb-8">
      <p className="text-body font-semibold text-ink-2">Cargando…</p>
    </div>
  );
}

function MissingAppt({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 pb-10 text-center">
      <p className="text-body font-semibold text-ink">No se ha podido abrir esta cita</p>
      <button type="button" onClick={onClose} className="text-[15px] font-bold text-v-2">
        Cerrar
      </button>
    </div>
  );
}

/** Come el clic con el que se abrió el aviso, que si no cae en la tira de días y cierra la ficha. */
function TapShield({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      className="fixed inset-0 z-[80]"
      onPointerDown={e => { e.preventDefault(); e.stopPropagation(); }}
      onClick={e => { e.preventDefault(); e.stopPropagation(); }}
    />
  );
}

async function loadAppt(sb: SupabaseClient, id: string): Promise<AgendaAppt | null> {
  let { data, error } = await sb.from('appointments').select(APPT_SELECT).eq('id', id).maybeSingle();
  if (error && /confirmed_at|client_pack|color/i.test(error.message)) {
    ({ data, error } = await sb.from('appointments').select(APPT_SELECT_CORE).eq('id', id).maybeSingle());
  }
  if (error || !data) return null;
  try { return mapAppt(data); } catch { return null; }
}

function serviceFallback(appt: AgendaAppt): ServiceOption {
  return {
    id: appt.service_id,
    name: appt.service_name || 'Tratamiento',
    category: appt.category,
    duration_min: appt.duration_min,
    price_cents: appt.price_cents ?? 0,
    color: appt.service_color,
  };
}

export default function AppointmentSheetHost({
  appointments, providers, canMoveProvider, initialId, startClosing,
}: {
  appointments: AgendaAppt[];
  providers: Provider[];
  canMoveProvider: boolean;
  initialId?: string | null;
  startClosing?: boolean;
}) {
  const router = useRouter();
  const close = useCloseSheet();
  const id = useShallowParam('appt', initialId ?? null);
  const closeQ = useShallowParam('close', startClosing ? '1' : null);
  const seed = id ? appointments.find(a => a.id === id) ?? null : null;
  const [fetched, setFetched] = useState<AgendaAppt | null>(null);
  const [sms, setSms] = useState<{
    status: string;
    sent_at: string | null;
    simulated: boolean;
    delivered_at: string | null;
    error_message: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [packs, setPacks] = useState<ClientPack[]>([]);
  const [serviceCounts, setServiceCounts] = useState<Record<string, number>>({});
  const [shield, setShield] = useState(Boolean(initialId));
  const armedFor = useRef<string | null>(null);
  const aligned = useRef('');
  const appt = seed ?? fetched;
  if (typeof window !== 'undefined' && id && armedFor.current !== id) {
    armedFor.current = id;
    armPushOpen();
  }

  useEffect(() => {
    const arm = () => setShield(true);
    window.addEventListener(PUSH_OPEN, arm);
    return () => window.removeEventListener(PUSH_OPEN, arm);
  }, []);

  useEffect(() => {
    if (!shield) return;
    const t = window.setTimeout(() => setShield(false), 800);
    return () => window.clearTimeout(t);
  }, [shield]);

  useEffect(() => {
    if (!id) {
      setFetched(null);
      setSms(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(!seed);
    if (seed) setFetched(null);
    const sb = createClient();
    void (async () => {
      const [row, smsRes, catalog] = await Promise.all([
        seed ? Promise.resolve(null) : loadAppt(sb, id),
        sb.from('sms_log').select('status, sent_at, simulated, delivered_at, error_message')
          .eq('appointment_id', id)
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
        Promise.all([
          loadServices(sb), loadSalonPacks(sb), loadServiceCounts(sb),
        ]),
      ]);
      if (!alive) return;
      const apptRow = seed ?? row;
      const [initialClients, pickedClient] = await Promise.all([
        loadClientPickerInitial(),
        apptRow?.client_id ? loadClientPickerById(apptRow.client_id) : Promise.resolve(null),
      ]);
      if (!alive) return;
      if (!seed) setFetched(row);
      setSms(smsRes.data ?? null);
      setServices(catalog[0]);
      const pool = [...initialClients];
      if (pickedClient && !pool.some(c => c.id === pickedClient.id)) pool.unshift(pickedClient);
      setClients(pool);
      setPacks(catalog[1]);
      setServiceCounts(catalog[2]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id, seed?.id]);

  useEffect(() => {
    if (!appt) return;
    const off = String(offsetFromDay(appt.starts_at));
    const params = new URLSearchParams(window.location.search);
    if ((params.get('day') ?? '0') === off && params.get('appt') === appt.id) return;
    params.set('day', off);
    params.set('appt', appt.id);
    const next = `/agenda?${params.toString()}`;
    if (aligned.current === next) return;
    aligned.current = next;
    router.replace(next, { scroll: false });
  }, [appt, router]);

  if (!id) return null;

  const shownServices = !appt
    ? services
    : services.some(s => s.id === appt.service_id)
      ? services
      : [serviceFallback(appt), ...services];

  if (closeQ === '1') {
    if (!appt && loading) {
      return (
        <>
          <TapShield active={shield} />
          <SheetShell onClose={close} initialHeight="tall" grabHeader>
            <SheetLoading />
          </SheetShell>
        </>
      );
    }
    if (!appt) {
      return (
        <>
          <TapShield active={shield} />
          <SheetShell onClose={close} initialHeight="tall" grabHeader>
            <MissingAppt onClose={close} />
          </SheetShell>
        </>
      );
    }
    return (
      <>
        <TapShield active={shield} />
        <AppointmentSheet
          appt={appt}
          providers={providers}
          canMoveProvider={canMoveProvider}
          startClosing
          sms={sms}
        />
      </>
    );
  }

  if (!appt && loading) {
    return (
      <>
        <TapShield active={shield} />
        <SheetShell onClose={close} initialHeight="tall" grabHeader>
          <SheetLoading />
        </SheetShell>
      </>
    );
  }
  if (!appt) {
    return (
      <>
        <TapShield active={shield} />
        <SheetShell onClose={close} initialHeight="tall" grabHeader>
          <MissingAppt onClose={close} />
        </SheetShell>
      </>
    );
  }

  const preselected = appt.client_id
    ? clients.find(c => c.id === appt.client_id) ?? {
        id: appt.client_id,
        full_name: appt.client_label,
        phone: appt.client_phone,
      }
    : null;

  return (
    <>
      <TapShield active={shield} />
      <SheetShell onClose={close} initialHeight="tall" grabHeader>
        <NewAppointmentSheetBody
          key={appt.id}
          day={dayKey(appt.starts_at)}
          providers={providers}
          services={shownServices}
          clients={clients}
          packs={packs}
          serviceCounts={serviceCounts}
          preselected={preselected}
          initialName={appt.client_label}
          initialProviderId={appt.provider_id}
          editing={appt}
        />
      </SheetShell>
    </>
  );
}
