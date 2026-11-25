import LeadsView from '@/components/leads/LeadsView';
import { leadTemplates, listLeadsPage } from '@/app/actions/leads';
import { leadsEnabled } from '@/lib/leads-enabled';
import { requireRole } from '@/lib/require-session';

export default async function LeadsPage() {
  const me = await requireRole('admin', 'reception');
  const on = await leadsEnabled(me.salon_id);
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
  const [page, templates] = await Promise.all([
    listLeadsPage(),
    leadTemplates({}),
  ]);
  return (
    <LeadsView
      leads={page.rows}
      hasMore={page.hasMore}
      salonTemplate={templates.salon}
    />
  );
}
