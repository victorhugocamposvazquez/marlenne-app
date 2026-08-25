'use client';

import { useEffect, useState } from 'react';
import NewAppointmentSheet from '@/components/agenda/NewAppointmentSheet';
import Sheet from '@/components/Sheet';
import { loadClientOptions, loadServices } from '@/lib/agenda-catalog';
import { createClient } from '@/lib/supabase/client';
import { useShallowParam } from '@/hooks/useShallowQuery';
import { bestNameMatches } from '@/lib/voice';
import type { ClientOption, Provider, ServiceOption } from '@/lib/types';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open !== '1') return;
    let alive = true;
    setLoading(true);
    const sb = createClient();
    void Promise.all([loadServices(sb), loadClientOptions(sb)]).then(([s, c]) => {
      if (!alive) return;
      setServices(s);
      setClients(c);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [open]);

  if (open !== '1') return null;
  if (loading && services.length === 0) {
    return (
      <Sheet title="Nueva cita">
        <div className="animate-pulse space-y-3">
          <div className="h-12 rounded-[12px] bg-surface-line" />
          <div className="h-12 rounded-[12px] bg-surface-line" />
          <div className="h-12 rounded-[12px] bg-surface-line" />
        </div>
      </Sheet>
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
      preselected={preselected}
      initialName={nombre ?? ''}
      initialHora={hora ?? ''}
      initialServiceQ={servicio ?? ''}
      initialProviderId={con ?? undefined}
    />
  );
}
