import type { CategoryId, StatusId } from './categories';

export type Provider = {
  id: string;
  full_name: string;
  initials: string | null;
  role: 'admin' | 'reception' | 'provider';
  job_title: string | null;
  color: string | null;
};

export type AgendaAppt = {
  id: string;
  provider_id: string;
  provider_name: string;
  client_id: string | null;
  client_label: string;
  service_id: string;
  service_name: string;
  category: CategoryId;
  param_keys: string[];
  starts_at: string;
  ends_at: string;
  duration_min: number;
  status: StatusId;
  price_cents: number | null;
  treatment_id: string | null;
  session_no: number | null;
};

export type AgendaBlock = {
  id: string;
  provider_id: string;
  reason: string;
  label: string | null;
  starts_at: string;
  duration_min: number;
};

export type WeekDay = {
  offset: number;
  dow: string;
  num: number;
  isToday: boolean;
  appointments: Pick<AgendaAppt, 'id' | 'starts_at' | 'duration_min' | 'category'>[];
};

export type ServiceOption = {
  id: string;
  name: string;
  category: CategoryId;
  duration_min: number;
  price_cents: number;
};

export type ClientOption = {
  id: string;
  full_name: string;
  phone: string | null;
};

export type ClientRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  tags: string[];
  notes: string | null;
  sms_opt_in: boolean;
  created_at: string;
};

export type Measurement = {
  id: string;
  metric: string;
  value_num: number | null;
  value_text: string | null;
  unit: string | null;
  session_no: number | null;
  is_baseline: boolean;
  measured_at: string;
};

export type TreatmentPhoto = {
  id: string;
  kind: 'before' | 'after';
  zone: string | null;
  session_no: number | null;
  storage_path: string;
  taken_at: string;
};

export type TreatmentRow = {
  id: string;
  zone: string | null;
  sessions_done: number;
  sessions_total: number;
  last_params: Record<string, string>;
  note: string | null;
  opened_at: string;
  closed_at: string | null;
  service: { name: string; category: CategoryId } | null;
  provider: { full_name: string } | null;
  measurements: Measurement[];
  treatment_photos: TreatmentPhoto[];
};

export type Consent = {
  id: string;
  kind: string;
  signed_at: string;
  expires_at: string | null;
};

export type WaitItem = {
  id: string;
  client_id: string | null;
  client_name: string | null;
  preference: string | null;
  created_at: string;
  service: { name: string; category: CategoryId } | null;
  client: { full_name: string; phone: string | null } | null;
};
