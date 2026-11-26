import AjustesHeader from '@/components/ajustes/AjustesHeader';
import MetaConnectCard from '@/components/ajustes/MetaConnectCard';
import { metaConnectStatus } from '@/app/actions/meta-connect';
import { requireRole } from '@/lib/require-session';
import { appOriginFromEnv } from '@/lib/app-origin';

export default async function AjustesLeadsPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requireRole('admin');
  const status = await metaConnectStatus();
  return (
    <AjustesHeader title="Leads">
      <MetaConnectCard
        status={status}
        error={searchParams.error ?? null}
        oauthStartUrl={`${appOriginFromEnv()}/api/meta/oauth/start`}
      />
    </AjustesHeader>
  );
}
