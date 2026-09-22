import type { CompanyPlan } from '@/lib/types';

export const MODAL_PLANS = [
  { name: 'Básico' as CompanyPlan, price: 29, desc: '1 profesional · 200 SMS/mes' },
  { name: 'Pro' as CompanyPlan, price: 49, desc: 'Hasta 3 profesionales · 500 SMS · reserva online' },
  { name: 'Premium' as CompanyPlan, price: 89, desc: 'Ilimitado · 1.500 SMS · WhatsApp · API' },
];

export const MODAL_BONUSES = [
  { name: 'Bono 200 SMS', sms: 200, price: 12 },
  { name: 'Bono 500 SMS', sms: 500, price: 25 },
  { name: 'Bono 2.000 SMS', sms: 2000, price: 80 },
];

export const MODAL_ROLES = [
  { name: 'Admin', desc: 'Todo: planes, precios, ajustes, equipo, bajas.' },
  { name: 'Soporte', desc: 'Empresas, modo soporte, bonos, reintentos. Sin precios ni cobros.' },
  { name: 'Finanzas', desc: 'Pagos, facturas, reembolsos. No entra en la app de las empresas.' },
];

export type ModalKind =
  | 'company'
  | 'plan'
  | 'bonus'
  | 'bonusFor'
  | 'changePlan'
  | 'expense'
  | 'referral'
  | 'invite';

export type ModalData = {
  name?: string;
  price?: number;
  sms?: number;
  pros?: number;
  plan?: CompanyPlan;
  company?: string;
  companyId?: number;
};
