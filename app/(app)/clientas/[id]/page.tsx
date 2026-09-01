import { notFound } from 'next/navigation';
import ClientaFicha from '@/components/clienta/ClientaFicha';
import { requireSession } from '@/lib/require-session';
import { getClient, listClientAppointments, listConsents, listSalonPackTemplates, listServices } from '@/lib/queries';

export default async function ClientaPage({
  params, searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string; editar?: string };
}) {
  const [me, data] = await Promise.all([requireSession(), getClient(params.id)]);
  const canEdit = me.role === 'admin' || me.role === 'reception';
  const { client, treatments, packs } = data;
  if (!client) notFound();

  const [appointments, consents, templates, services] = await Promise.all([
    listClientAppointments(client.id),
    listConsents(client.id),
    canEdit ? listSalonPackTemplates() : Promise.resolve([]),
    canEdit ? listServices() : Promise.resolve([]),
  ]);

  return (
    <ClientaFicha
      client={client}
      treatments={treatments}
      packs={packs}
      templates={templates}
      services={services}
      appointments={appointments}
      consents={consents}
      canEdit={canEdit}
      initialTab={searchParams.tab}
      initialEdit={searchParams.editar === '1'}
    />
  );
}
