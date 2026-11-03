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
  /** Hex principal del widget; null = default. */
  accent?: string | null;
  accent_soft?: string | null;
  ink?: string | null;
  /** URL pública del logo (rellenada en servidor). */
  logo_url?: string | null;
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

export type BookingPaymentMode = 'free' | 'pay_full' | 'pay_deposit';

export type BookingLink = {
  id: string;
  key: string;
  label: string | null;
  custom_title: string | null;
  service_id: string | null;
  provider_id: string | null;
  payment_mode: BookingPaymentMode;
  deposit_bps: number;
};

export type BookingConfirm = {
  ok: true;
  id: string;
  starts_at: string;
  duration_min: number;
  service_name: string;
  salon_name: string;
  client_name: string;
  salon_id?: string;
  client_email?: string | null;
  client_phone?: string | null;
  timezone?: string | null;
  notify_email?: string | null;
  sms_reminders?: boolean | null;
};

export type BookingFail = { ok: false; code: string; message?: string };

/** Redirect a Stripe Checkout en lugar de confirmación inmediata. */
export type BookingCheckoutRedirect = {
  ok: true;
  checkout: true;
  url: string;
  intentId: string;
};
