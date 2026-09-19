'use client';

import { useEffect, useState } from 'react';
import AppointmentSheet from '@/components/agenda/AppointmentSheet';
import NewAppointmentSheet from '@/components/agenda/NewAppointmentSheet';
import Sheet from '@/components/Sheet';
import { SheetSkeleton } from '@/components/ui/Skeleton';
import { loadClientOptions, loadSalonPacks, loadServiceCounts, loadServices } from '@/lib/agenda-catalog';
import { createClient } from '@/lib/supabase/client';
import { APPT_SELECT, mapAppt } from '@/lib/agenda-appt';
import { useShallowParam } from '@/hooks/useShallowQuery';
import { dayKey } from '@/lib/time';
import type { AgendaAppt, ClientOption, ClientPack, Provider, ServiceOption } from '@/lib/types';

export default function AppointmentSheetHost({
  appointments, providers, canMoveProvider, initialId, startClosing,
}: {
  appointments: AgendaAppt[];
  providers: Provider[];
  canMoveProvider: boolean;
  initialId?: string | null;
  startClosing?: boolean;
}) {
  const id = useShallowParam('appt', initialId ?? null);
  const closeQ = useShallowParam('close', startClosing ? '1' : null);
  const seed = id ? appointments.find(a => a.id === id) ?? null : null;
  const [fetched, setFetched] = useState<AgendaAppt | null>(null);
  const [sms, setSms] = useState<{ status: string; sent_at: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [packs, setPacks] = useState<ClientPack[]>([]);
  const [serviceCounts, setServiceCounts] = useState<Record<string, number>>({});
  const appt = seed ?? fetched;

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
      const [{ data: row }, { data: smsRow }, catalog] = await Promise.all([
        seed
          ? Promise.resolve({ data: null as unknown })
          : sb.from('appointments').select(APPT_SELECT).eq('id', id).maybeSingle(),
        sb.from('sms_log').select('status, sent_at').eq('appointment_id', id)
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
        Promise.all([
          loadServices(sb), loadClientOptions(sb), loadSalonPacks(sb), loadServiceCounts(sb),
        ]),
      ]);
      if (!alive) return;
      if (!seed) setFetched(row ? mapAppt(row) : null);
      setSms(smsRow ?? null);
      setServices(catalog[0]);
      setClients(catalog[1]);
      setPacks(catalog[2]);
      setServiceCounts(catalog[3]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id, seed?.id]);

  if (!id) return null;
  if (!appt && loading) {
    return (
      <Sheet title="Cita">
        <SheetSkeleton />
      </Sheet>
    );
  }
  if (!appt) return null;

  if (closeQ === '1') {
    return (
      <AppointmentSheet
        appt={appt}
        providers={providers}
        canMoveProvider={canMoveProvider}
        startClosing
        sms={sms}
      />
    );
  }

  if (services.length === 0) {
    return (
      <Sheet title="Cita">
        <SheetSkeleton />
      </Sheet>
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
    <NewAppointmentSheet
      key={appt.id}
      day={dayKey(appt.starts_at)}
      providers={providers}
      services={services}
      clients={clients}
      packs={packs}
      serviceCounts={serviceCounts}
      preselected={preselected}
      initialName={appt.client_label}
      initialProviderId={appt.provider_id}
      editing={appt}
    />
  );
}
