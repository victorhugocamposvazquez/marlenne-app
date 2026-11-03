/** Tipos del booking público. Sin DOM ni next/*. */

export type BookingSalon = {
  id: string;
  name: string;
  slug: string;
  intro: string | null;
  timezone: string;
  opens_at: string;
  closes_at: string;
  phone: string | null;
  logo_path: string | null;
};

export type BookingService = {
  id: string;
  name: string;
  /** Slug amigable /r/{salon}/{slug}. */
  slug?: string | null;
  category: string;
  duration_min: number;
  price_cents: number;
  color: string | null;
  sort_order: number;
};

export type BookingProvider = {
  id: string;
  name: string;
  /** Slug amigable ?con={slug}. */
  slug?: string | null;
  sort_order: number;
};

export type BookingCatalog = {
  ok: true;
  salon: BookingSalon;
  services: BookingService[];
  providers: BookingProvider[];
};

export type BookingSlot = {
  starts_at: string;
  provider_id: string;
  label: string;
};

export type BookingConfirm = {
  ok: true;
  id: string;
  starts_at: string;
  duration_min: number;
  service_name: string;
  salon_name: string;
  client_name: string;
};

export type BookingFail = { ok: false; code: string; message?: string };
