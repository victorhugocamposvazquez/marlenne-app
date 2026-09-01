import type { CategoryId, StatusId } from './categories';

export type StaffRole = 'admin' | 'reception' | 'provider';

export type Provider = {
  id: string;
  full_name: string;
  initials: string | null;
  role: StaffRole;
  job_title: string | null;
  color: string | null;
  is_active?: boolean;
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
  note: string | null;
  client_phone: string | null;
  confirmed_at: string | null;
  client_pack_id: string | null;
  pack_name: string | null;
};

export type Waiter = {
  id: string;
  client_id: string | null;
  name: string;
  phone: string | null;
  service: string | null;
  preference: string | null;
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
  name: string;
  num: number;
  isToday: boolean;
  appointments: Pick<AgendaAppt, 'id' | 'starts_at' | 'duration_min' | 'category' | 'client_label' | 'service_name' | 'provider_name' | 'status'>[];
};

export type ServiceOption = {
  id: string;
  name: string;
  category: CategoryId;
  duration_min: number;
  price_cents: number;
  is_active?: boolean;
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

export type ClientListRow = ClientOption & {
  tags: string[];
  open_treatments: string[];
  open_packs: string[];
  next_at: string | null;
  last_at: string | null;
};

export type RecallRow = {
  client_id: string;
  full_name: string;
  phone: string | null;
  last_at: string;
  service_name: string | null;
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

export type PackTemplate = {
  id: string;
  name: string;
  service_id: string | null;
  service_name: string | null;
  sessions_total: number;
  price_cents: number;
  valid_days: number | null;
  is_active: boolean;
  sort_order: number;
};

export type ClientPack = {
  id: string;
  name: string;
  service_id: string | null;
  service_name: string | null;
  owner_client_id: string;
  owner_name: string;
  friend_client_id: string | null;
  friend_name: string | null;
  sessions_total: number;
  sessions_done: number;
  reserved: number;
  remaining: number;
  price_cents: number;
  purchased_at: string;
  expires_at: string | null;
  note: string | null;
  template_id: string | null;
};
