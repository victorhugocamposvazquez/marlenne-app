'use client';

import { Download } from 'lucide-react';
import IconButton from '@/components/ui/IconButton';
import { useToast } from '@/components/Toast';
import { fichaFileName, formatClientFicha } from '@/lib/client-export';
import type { AgendaAppt, ClientPack, ClientRow, Consent, TreatmentRow } from '@/lib/types';

export default function ExportFichaButton({
  client, treatments, packs = [], appointments, consents,
}: {
  client: ClientRow;
  treatments: TreatmentRow[];
  packs?: ClientPack[];
  appointments: AgendaAppt[];
  consents: Consent[];
}) {
  const toast = useToast();

  const download = () => {
    const body = formatClientFicha({ client, treatments, packs, appointments, consents });
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = fichaFileName(client.full_name);
    a.click();
    URL.revokeObjectURL(href);
    toast('Ficha descargada');
  };

  return (
    <IconButton label="Exportar ficha" onClick={download}>
      <Download size={17} strokeWidth={2.2} />
    </IconButton>
  );
}
