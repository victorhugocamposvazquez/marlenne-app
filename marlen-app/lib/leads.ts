/** Leads de Meta. Sin DOM ni next: color, plantilla y el texto del push. */

export type LeadChannel = 'call' | 'whatsapp';

export type LeadTone = 'none' | LeadChannel;

export function leadTone(channel: string | null | undefined): LeadTone {
  if (channel === 'call' || channel === 'whatsapp') return channel;
  return 'none';
}

/** Titular del anuncio (creatividad): titular o nombre Meta, en mayúsculas. */
export function leadAdTitle(headline: string | null | undefined, fallback?: string | null) {
  const raw = headline?.trim() || fallback?.trim() || '';
  return raw ? raw.toLocaleUpperCase('es-ES') : '';
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
    .replaceAll('{{anuncio}}', leadAdTitle(vars.anuncio) || 'el anuncio')
    .replaceAll('{{centro}}', vars.centro?.trim() || 'el centro')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const META_PUSH_ICON = '/meta-push-192.png';
export const META_PUSH_BADGE = '/meta-push-badge.png';

/** Título único del push de leads (Meta, manual y pruebas). */
export const LEAD_PUSH_TITLE = 'Marlén - 🔥Nuevo lead 💪';

export function leadPushCopy(input: {
  name: string;
  campaign?: string | null;
  ad?: string | null;
  phone?: string | null;
  fromMeta?: boolean;
}) {
  const name = input.name.trim() || 'Nuevo lead';
  const from = input.ad?.trim() || input.campaign?.trim();
  const title = LEAD_PUSH_TITLE;
  const parts = [name];
  if (from) parts.push(from);
  const phone = input.phone?.trim();
  if (phone) parts.push(phone);
  let body = parts.join(' · ');
  if (input.fromMeta) body = `Meta · ${body}`;
  return { title, body };
}

export function leadPushUrl(leadId: string) {
  return `/leads/${leadId}`;
}

export function leadPushTag(leadId: string, fromMeta?: boolean) {
  return fromMeta ? `lead-meta-${leadId}` : `lead-${leadId}`;
}

/** Etiquetas fijas de la ficha. `volver` puede llevar un día. */
export const LEAD_TAGS = [
  { id: 'volver', label: 'Volver a llamar' },
  { id: 'no_responde', label: 'No responde' },
  { id: 'no_interesado', label: 'No interesado' },
  { id: 'quiere_cita', label: 'Quiere cita' },
  { id: 'pensando', label: 'Pensándoselo' },
  { id: 'numero_erroneo', label: 'Número erróneo' },
] as const;

export const LEAD_CALLBACK_TAG = 'volver';

const LEAD_TAG_LABEL = new Map<string, string>(LEAD_TAGS.map(tag => [tag.id, tag.label]));

export function leadTagLabel(id: string) {
  return LEAD_TAG_LABEL.get(id) ?? id;
}

export function isLeadTagId(id: string) {
  return LEAD_TAG_LABEL.has(id);
}

const LEAD_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Día de calendario `YYYY-MM-DD` → `28 nov`. Vacío si no es un día. */
export function formatLeadDay(ymd: string | null | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd?.trim() ?? '');
  if (!match) return '';
  const month = LEAD_MONTHS[Number(match[2]) - 1];
  const day = Number(match[3]);
  if (!month || day < 1 || day > 31) return '';
  return `${day} ${month}`;
}

export function normalizeLeadDay(value: string | null | undefined) {
  const day = value?.trim().slice(0, 10) ?? '';
  return formatLeadDay(day) ? day : null;
}

export function leadTagsSummary(tags: string[], callbackOn?: string | null) {
  const day = formatLeadDay(callbackOn);
  return tags.map(id => {
    if (id === LEAD_CALLBACK_TAG && day) return `Volver a llamar · ${day}`;
    return leadTagLabel(id);
  }).join(' · ');
}

export type LeadFormField = { key: string; label: string; value: string };

const FORM_LABELS: Record<string, string> = {
  full_name: 'Nombre',
  first_name: 'Nombre',
  last_name: 'Apellidos',
  phone_number: 'Teléfono',
  phone: 'Teléfono',
  email: 'Email',
  city: 'Ciudad',
  state: 'Provincia',
  country: 'País',
  zip: 'Código postal',
  postal_code: 'Código postal',
  street_address: 'Dirección',
  company_name: 'Empresa',
  job_title: 'Cargo',
  work_phone_number: 'Teléfono trabajo',
  work_email: 'Email trabajo',
  date_of_birth: 'Fecha de nacimiento',
  gender: 'Género',
  marital_status: 'Estado civil',
  relationship_status: 'Estado civil',
  military_status: 'Situación militar',
};

export function leadFormFieldLabel(key: string) {
  const norm = key.trim().toLowerCase().replace(/-/g, '_');
  if (FORM_LABELS[norm]) return FORM_LABELS[norm];
  const pretty = norm.replace(/_/g, ' ');
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

/** Todas las respuestas del formulario de Meta, para la ficha. */
export function leadFormRowsFromMeta(fields: { name?: string; values?: string[] }[] | null | undefined): LeadFormField[] {
  const rows: LeadFormField[] = [];
  const seen = new Set<string>();
  for (const field of fields ?? []) {
    const rawKey = field.name?.trim();
    if (!rawKey) continue;
    const key = rawKey.toLowerCase();
    if (seen.has(key)) continue;
    const value = (field.values ?? [])
      .map(v => v?.trim())
      .filter(Boolean)
      .join(', ');
    if (!value) continue;
    seen.add(key);
    rows.push({ key, label: leadFormFieldLabel(rawKey), value });
  }
  return rows;
}

export function parseLeadFormFields(raw: unknown): LeadFormField[] {
  if (!Array.isArray(raw)) return [];
  const out: LeadFormField[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as { key?: string; label?: string; value?: string };
    const value = row.value?.trim();
    if (!value) continue;
    const key = row.key?.trim() || value;
    out.push({
      key,
      label: row.label?.trim() || leadFormFieldLabel(key),
      value,
    });
  }
  return out;
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
