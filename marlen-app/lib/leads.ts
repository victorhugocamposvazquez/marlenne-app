/** Leads de Meta. Sin DOM ni next: color, plantilla y el texto del push. */

export type LeadChannel = 'call' | 'whatsapp';

export type LeadTone = 'none' | LeadChannel;

export function leadTone(channel: string | null | undefined): LeadTone {
  if (channel === 'call' || channel === 'whatsapp') return channel;
  return 'none';
}

export const DEFAULT_LEAD_WA =
  'Hola {{nombre}}, te escribo de {{centro}} por el anuncio {{anuncio}}. ¿Te va bien que te cuente?';

export function resolveLeadTemplate(input: {
  ad?: string | null;
  campaign?: string | null;
  salon?: string | null;
}): { body: string; scope: 'ad' | 'campaign' | 'salon' } {
  const ad = input.ad?.trim();
  if (ad) return { body: ad, scope: 'ad' };
  const campaign = input.campaign?.trim();
  if (campaign) return { body: campaign, scope: 'campaign' };
  const salon = input.salon?.trim();
  if (salon) return { body: salon, scope: 'salon' };
  return { body: DEFAULT_LEAD_WA, scope: 'salon' };
}

export function renderLeadTemplate(
  body: string,
  vars: { nombre: string; campana?: string | null; anuncio?: string | null; centro?: string | null },
) {
  const nombre = vars.nombre.trim().split(/\s+/)[0] || 'hola';
  return body
    .replaceAll('{{nombre}}', nombre)
    .replaceAll('{{campaña}}', vars.campana?.trim() || 'la campaña')
    .replaceAll('{{anuncio}}', vars.anuncio?.trim() || 'el anuncio')
    .replaceAll('{{centro}}', vars.centro?.trim() || 'el centro')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function leadPushCopy(input: { name: string; campaign?: string | null; ad?: string | null }) {
  const name = input.name.trim() || 'Nuevo lead';
  const from = input.ad?.trim() || input.campaign?.trim();
  return {
    title: 'Nuevo lead',
    body: from ? `${name} · ${from}` : name,
  };
}

export function leadPushUrl(leadId: string) {
  return `/leads/${leadId}`;
}

/** Campos típicos del formulario de Meta. */
export function leadFieldsFromMeta(fields: { name?: string; values?: string[] }[] | null | undefined) {
  const map = new Map<string, string>();
  for (const field of fields ?? []) {
    const key = (field.name ?? '').toLowerCase();
    const value = field.values?.find(v => v?.trim())?.trim();
    if (key && value) map.set(key, value);
  }
  const first = map.get('first_name') ?? '';
  const last = map.get('last_name') ?? '';
  const full = map.get('full_name') || [first, last].filter(Boolean).join(' ');
  return {
    fullName: full || 'Lead sin nombre',
    phone: map.get('phone_number') || map.get('phone') || null,
    email: map.get('email') || null,
  };
}
