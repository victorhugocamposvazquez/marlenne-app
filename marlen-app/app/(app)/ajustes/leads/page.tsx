import AjustesHeader from '@/components/ajustes/AjustesHeader';
import LeadsSetupCard from '@/components/ajustes/LeadsSetupCard';
import MetaConnectCard from '@/components/ajustes/MetaConnectCard';
import { salonLeadWaTemplate } from '@/app/actions/leads';
import { getLeadsListGroup } from '@/app/actions/leads-settings';
import { metaConnectStatus } from '@/app/actions/meta-connect';
import { requireRole } from '@/lib/require-session';
import { appOriginFromEnv } from '@/lib/app-origin';

export default async function AjustesLeadsPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requireRole('admin');
  const [status, listGroup, salonTemplate] = await Promise.all([
    metaConnectStatus(),
    getLeadsListGroup(),
    salonLeadWaTemplate(),
  ]);
  return (
    <AjustesHeader title="Leads">
      <MetaConnectCard
        status={status}
        error={searchParams.error ?? null}
        oauthStartUrl={`${appOriginFromEnv()}/api/meta/oauth/start`}
      />
      <LeadsSetupCard listGroup={listGroup} salonTemplate={salonTemplate} />
    </AjustesHeader>
  );
}
