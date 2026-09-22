import type { NavId } from '@/lib/types';

export type NavItem = {
  id: NavId;
  label: string;
  href: string;
  icon: string;
  badge?: string;
};

export const NAV: NavItem[] = [
  { id: 'inicio', label: 'Inicio', href: '/', icon: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { id: 'empresas', label: 'Empresas', href: '/empresas', icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-8h6v8', badge: '1.152' },
  { id: 'planes', label: 'Planes y bonos', href: '/planes', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
  { id: 'sms', label: 'SMS', href: '/sms', icon: 'M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z' },
  { id: 'pagos', label: 'Pagos', href: '/pagos', icon: 'M2 8h20v8H2z M2 10h20' },
  { id: 'servicios', label: 'Estado servicios', href: '/servicios', icon: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z M12 6v6l4 2' },
  { id: 'equipo', label: 'Equipo', href: '/equipo', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
  { id: 'ajustes', label: 'Ajustes SaaS', href: '/ajustes', icon: 'M12 15.5A3.5 3.5 0 1 0 8.5 12 3.5 3.5 0 0 0 12 15.5z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68V4.6a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.36 0 .7.07 1 .2V9a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' },
];

export const MOBILE_TABS = NAV.filter(n => ['inicio', 'empresas', 'sms', 'pagos', 'ajustes'].includes(n.id));
