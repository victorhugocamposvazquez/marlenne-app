import ClientasView from '@/components/clienta/ClientasView';
import { CLIENT_LIST_PAGE, listClientsPage } from '@/lib/clients-list-page';
import { requireCompany } from '@/lib/require-session';

export default async function ClientasPage({ searchParams }: { searchParams: { alta?: string } }) {
  await requireCompany();
  const { rows, total } = await listClientsPage(0, CLIENT_LIST_PAGE);

  return (
    <ClientasView
      initialClients={rows}
      initialTotal={total}
      initialAlta={searchParams.alta === '1'}
    />
  );
}
