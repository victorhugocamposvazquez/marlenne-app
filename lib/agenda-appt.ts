import type { AgendaAppt } from '@/lib/types';

export const APPT_SELECT = `
  id, provider_id, client_id, client_name, starts_at, ends_at, duration_min,
  status, price_cents, treatment_id, session_no, service_id, note,
  service:services(name, category, param_keys),
  provider:staff!appointments_provider_id_fkey(full_name),
  client:clients(full_name, phone)
`;

export function mapAppt(row: unknown): AgendaAppt {
  const r = row as {
    id: string;
    provider_id: string;
    client_id?: string | null;
    client_name?: string | null;
    starts_at: string;
    ends_at: string;
    duration_min: number;
    status: AgendaAppt['status'];
    price_cents: number | null;
    treatment_id: string | null;
    session_no: number | null;
    service_id: string;
    note?: string | null;
    service?: { name?: string; category?: AgendaAppt['category']; param_keys?: string[] } | null;
    provider?: { full_name?: string } | null;
    client?: { full_name?: string; phone?: string | null } | null;
  };
  return {
    id: r.id,
    provider_id: r.provider_id,
    provider_name: r.provider?.full_name ?? '',
    client_id: r.client_id ?? null,
    client_label: r.client?.full_name ?? r.client_name ?? 'Sin nombre',
    service_id: r.service_id,
    service_name: r.service?.name ?? '',
    category: r.service?.category ?? 'corporal',
    param_keys: r.service?.param_keys ?? [],
    starts_at: r.starts_at,
    ends_at: r.ends_at,
    duration_min: r.duration_min,
    status: r.status,
    price_cents: r.price_cents,
    treatment_id: r.treatment_id,
    session_no: r.session_no,
    note: r.note ?? null,
    client_phone: r.client?.phone ?? null,
  };
}
