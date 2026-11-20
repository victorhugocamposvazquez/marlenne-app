'use client';

import { useEffect, useState } from 'react';
import { NewAppointmentSheetBody } from '@/components/agenda/NewAppointmentSheet';
import SheetShell from '@/components/SheetShell';
import { useCloseSheet } from '@/components/Sheet';
import { loadClientPickerById } from '@/app/actions/client-list';
import { createClient } from '@/lib/supabase/client';
import { readSheetCatalog, subscribeSheetCatalog, warmSheetCatalog } from '@/hooks/sheet-catalog';
import { useShallowParam } from '@/hooks/useShallowQuery';
import type { ClientOption, ClientPack, PackTemplate, Provider, ServiceOption } from '@/lib/types';

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

  const snap = readSheetCatalog();
  const [services, setServices] = useState<ServiceOption[]>(snap?.services ?? []);
  const [clients, setClients] = useState<ClientOption[]>(snap?.clients ?? []);
  const [packs, setPacks] = useState<ClientPack[]>(snap?.packs ?? []);
  const [templates, setTemplates] = useState<PackTemplate[]>(snap?.templates ?? []);
  const [serviceCounts, setServiceCounts] = useState<Record<string, number>>(snap?.counts ?? {});
  const [loading, setLoading] = useState(!snap?.services.length);

  const apply = (cat: NonNullable<ReturnType<typeof readSheetCatalog>>) => {
    setServices(cat.services);
    setPacks(cat.packs);
    setTemplates(cat.templates);
    setServiceCounts(cat.counts);
    setClients(prev => {
      const extra = prev.filter(c => !cat.clients.some(n => n.id === c.id));
      return [...extra, ...cat.clients];
    });
    if (cat.services.length) setLoading(false);
  };

  useEffect(() => subscribeSheetCatalog(apply), []);

  useEffect(() => {
    if (open !== '1') return;
    let alive = true;
    const known = readSheetCatalog();
    if (known?.services.length) {
      apply(known);
      setLoading(false);
    } else {
      setLoading(true);
    }
    const sb = createClient();
    void Promise.all([
      warmSheetCatalog(sb, { full: true }),
      clientId ? loadClientPickerById(clientId) : Promise.resolve(null),
    ]).then(([, picked]) => {
      if (!alive) return;
      const latest = readSheetCatalog();
      if (latest) apply(latest);
      if (picked) {
        setClients(prev => (prev.some(c => c.id === picked.id) ? prev : [picked, ...prev]));
      }
      setLoading(false);
    });
    return () => { alive = false; };
  }, [open, clientId]);

  if (open !== '1') return null;

  const preselected = clientId ? (clients.find(c => c.id === clientId) ?? null) : null;

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
          templates={templates}
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
