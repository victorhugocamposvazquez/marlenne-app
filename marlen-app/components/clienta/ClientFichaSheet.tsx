'use client';

import { useEffect, useState } from 'react';
import ClientaFicha from '@/components/clienta/ClientaFicha';
import { LocalSheet } from '@/components/Sheet';
import { loadClientFicha } from '@/app/actions/clients';

type Ficha = NonNullable<Awaited<ReturnType<typeof loadClientFicha>>>;

/** Ficha de la clienta encima de la cita. Cerrarla deja la cita donde estaba. */
export default function ClientFichaSheet({
  clientId, onClose,
}: {
  clientId: string;
  onClose: () => void;
}) {
  const [rev, setRev] = useState(0);
  const [data, setData] = useState<Ficha | null | undefined>(undefined);

  useEffect(() => {
    setData(undefined);
  }, [clientId]);

  useEffect(() => {
    let alive = true;
    void loadClientFicha(clientId).then(row => {
      if (alive) setData(row);
    }).catch(() => {
      if (alive) setData(null);
    });
    return () => { alive = false; };
  }, [clientId, rev]);

  const title = data?.client.full_name ?? 'Ficha';

  return (
    <LocalSheet
      open
      onClose={onClose}
      title={title}
      subtitle={data?.client.phone ?? 'Clienta'}
      initialHeight="tall"
      above
    >
      {data === undefined && (
        <p className="py-8 text-center text-body font-semibold text-ink-2">Cargando ficha…</p>
      )}
      {data === null && (
        <p className="py-8 text-center text-body font-semibold text-ink-2">No se ha podido abrir la ficha.</p>
      )}
      {data && (
        <ClientaFicha
          client={data.client}
          treatments={data.treatments}
          packs={data.packs}
          templates={data.templates}
          services={data.services}
          appointments={data.appointments}
          consents={data.consents}
          canEdit={data.canEdit}
          overlay
          onUpdated={() => setRev(n => n + 1)}
        />
      )}
    </LocalSheet>
  );
}
