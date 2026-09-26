import ClientasView from '@/components/clienta/ClientasView';
import { CLIENT_LIST_PAGE, listClientsPage } from '@/lib/clients-list-page';

export default async function ClientasPage({ searchParams }: { searchParams: { alta?: string } }) {
  const { rows, total } = await listClientsPage(0, CLIENT_LIST_PAGE);

  return (
    <ClientasView
      initialClients={rows}
      initialTotal={total}
      initialAlta={searchParams.alta === '1'}
    />
  );
}
