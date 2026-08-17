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
  service_name: string;
  category: CategoryId;
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
