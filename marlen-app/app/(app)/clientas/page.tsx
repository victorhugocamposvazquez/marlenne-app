import ClientasView from '@/components/clienta/ClientasView';
import { listClients } from '@/lib/queries';

export default async function ClientasPage({ searchParams }: { searchParams: { alta?: string } }) {
  const clients = await listClients();

  return <ClientasView clients={clients} initialAlta={searchParams.alta === '1'} />;
}
