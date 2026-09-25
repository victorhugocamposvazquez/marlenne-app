export type CompanyStatus = 'Activa' | 'Impago' | 'Prueba' | 'Pausada';
export type CompanyPlan = 'Básico' | 'Pro' | 'Premium';

export type Company = {
  id: number;
  name: string;
  city: string;
  plan: CompanyPlan;
  price: number;
  status: CompanyStatus;
  smsTotal: number;
  smsLeft: number;
  pros: number;
  since: string;
  next: string;
  contact: string;
  email: string;
  phone: string;
  stripe: string;
  avatar: string;
  mrr: number;
  /** Empresa de verdad, usando la app en producción. El resto de la lista es muestra. */
  live?: boolean;
};

export type NavId =
  | 'inicio'
  | 'empresas'
  | 'planes'
  | 'sms'
  | 'pagos'
  | 'finanzas'
  | 'servicios'
  | 'equipo'
  | 'ajustes';
