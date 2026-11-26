import { notFound } from 'next/navigation';
import LeadFicha from '@/components/leads/LeadFicha';
import { getLead, leadTemplates, listLeadEvents } from '@/app/actions/leads';
import { leadsDesk } from '@/lib/leads-desk';

export default async function LeadPage({ params }: { params: { id: string } }) {
  const { me } = await leadsDesk();
  const lead = await getLead(params.id);
  if (!lead) notFound();
  const [events, templates] = await Promise.all([
    listLeadEvents(lead.id),
    leadTemplates({ campaignId: lead.campaign_id, adId: lead.ad_id }),
  ]);
  return (
    <LeadFicha
      lead={lead}
      events={events}
      templates={templates}
      salonName={me.salon_name}
    />
  );
}
