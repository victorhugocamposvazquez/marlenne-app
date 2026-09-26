'use client';

import { useEffect, useState } from 'react';
import { NewAppointmentSheetBody } from '@/components/agenda/NewAppointmentSheet';
import SheetShell from '@/components/SheetShell';
import { useCloseSheet } from '@/components/Sheet';
import { loadClientPickerById } from '@/app/actions/client-list';
import { loadSalonPacks, loadServiceCounts, loadServices } from '@/lib/agenda-catalog';
import { createClient } from '@/lib/supabase/client';
import { useShallowParam } from '@/hooks/useShallowQuery';
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
  const close = useCloseSheet();
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
    setClients([]);
    const sb = createClient();
    void Promise.all([
      loadServices(sb),
      loadSalonPacks(sb),
      loadServiceCounts(sb),
      clientId ? loadClientPickerById(clientId) : Promise.resolve(null),
    ]).then(([s, p, counts, picked]) => {
      if (!alive) return;
      setServices(s);
      setPacks(p);
      setServiceCounts(counts);
      if (picked) setClients([picked]);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [open, clientId]);

  if (open !== '1') return null;

  const preselected = clients.find(c => c.id === clientId) ?? clients[0] ?? null;

  return (
    <SheetShell onClose={close} initialHeight="tall" grabHeader>
      {loading && services.length === 0 ? (
        <div className="flex flex-1 items-center justify-center pb-8">
          <p className="text-body font-semibold text-ink-2">Cargando…</p>
        </div>
      ) : (
        <NewAppointmentSheetBody
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
      )}
    </SheetShell>
  );
}
