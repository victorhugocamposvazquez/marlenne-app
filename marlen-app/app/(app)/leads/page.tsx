import LeadsView from '@/components/leads/LeadsView';
import { listLeadGroupNames, listLeadsPage, salonLeadWaTemplate } from '@/app/actions/leads';
import { leadsDesk } from '@/lib/leads-desk';

export default async function LeadsPage() {
  const { on, listGroup } = await leadsDesk();
  if (!on) {
    return (
      <div className="flex flex-1 flex-col justify-center px-6">
        <h1 className="text-h1 font-bold tracking-[-.03em]">Leads</h1>
        <p className="mt-2 max-w-[360px] text-body font-medium text-ink-2">
          Esta función no está activada para el centro. La enciende el equipo de Marlén desde OPS.
        </p>
      </div>
    );
  }
  const [page, salonTemplate, groupNames] = await Promise.all([
    listLeadsPage(),
    salonLeadWaTemplate(),
    listLeadGroupNames(listGroup),
  ]);
  return (
    <LeadsView
      leads={page.rows}
      hasMore={page.hasMore}
      salonTemplate={salonTemplate}
      listGroup={listGroup}
      groupNames={groupNames}
    />
  );
}
