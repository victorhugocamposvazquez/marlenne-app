'use client';

import { useEffect, useState } from 'react';
import NewAppointmentSheet from '@/components/agenda/NewAppointmentSheet';
import { loadClientOptions, loadSalonPacks, loadServiceCounts, loadServices } from '@/lib/agenda-catalog';
import { createClient } from '@/lib/supabase/client';
import { useShallowParam } from '@/hooks/useShallowQuery';
import { bestNameMatches } from '@/lib/voice';
import type { ClientOption, ClientPack, Provider, ServiceOption } from '@/lib/types';

export default function NewAppointmentSheetHost({
  day, providers,
  initialOpen, initialClient, initialNombre, initialHora, initialServicio, initialCon,
}: {
  day: string;
  providers: Provider[];
  initialOpen?: boolean;
  initialClient?: string;
  initialNombre?: string;
  initialHora?: string;
  initialServicio?: string;
  initialCon?: string;
}) {
  const open = useShallowParam('new', initialOpen ? '1' : null);
  const clientId = useShallowParam('client', initialClient ?? null);
  const nombre = useShallowParam('nombre', initialNombre ?? null);
  const hora = useShallowParam('hora', initialHora ?? null);
  const servicio = useShallowParam('servicio', initialServicio ?? null);
  const con = useShallowParam('con', initialCon ?? null);

  const [services, setServices] = useState<ServiceOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [packs, setPacks] = useState<ClientPack[]>([]);
  const [serviceCounts, setServiceCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open !== '1') return;
    let alive = true;
    setLoading(true);
    const sb = createClient();
    void Promise.all([
      loadServices(sb), loadClientOptions(sb), loadSalonPacks(sb), loadServiceCounts(sb),
    ]).then(([s, c, p, counts]) => {
      if (!alive) return;
      setServices(s);
      setClients(c);
      setPacks(p);
      setServiceCounts(counts);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [open]);

  if (open !== '1') return null;
  if (loading && services.length === 0) {
    return (
      <div className="absolute inset-0 z-40 grid place-items-center bg-surface-bg">
        <p className="text-body font-semibold text-ink-2">Cargando…</p>
      </div>
    );
  }

  const preselected = clients.find(c => c.id === clientId)
    ?? (nombre ? bestNameMatches(clients, nombre, c => c.full_name)[0] ?? null : null);

  return (
    <NewAppointmentSheet
      day={day}
      providers={providers}
      services={services}
      clients={clients}
      packs={packs}
      serviceCounts={serviceCounts}
      preselected={preselected}
      initialName={nombre ?? ''}
      initialHora={hora ?? ''}
      initialServiceQ={servicio ?? ''}
      initialProviderId={con ?? undefined}
    />
  );
}
