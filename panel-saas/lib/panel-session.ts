import { cookies } from 'next/headers';
import { initials } from '@/lib/format';
import { SESSION_COOKIE } from '@/lib/auth';

export type PanelUser = {
  email: string;
  name: string;
  initials: string;
};

/** Nombre legible a partir del correo con el que entraste en Ops. */
export function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0]?.trim() ?? email;
  const parts = local.replace(/[.+_-]/g, ' ').split(/\s+/).filter(Boolean);
  if (!parts.length) return email;
  return parts
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');
}

export function getPanelUser(): PanelUser | null {
  const raw = cookies().get(SESSION_COOKIE)?.value?.trim().toLowerCase();
  if (!raw || !raw.includes('@')) return null;
  const name = displayNameFromEmail(raw);
  return { email: raw, name, initials: initials(name) };
}

const MADRID = 'Europe/Madrid';

export function panelFirstName(user: PanelUser | null): string {
  const name = user?.name?.trim();
  if (!name) return 'Operador';
  return name.split(/\s+/)[0] ?? name;
}

/** Saludo del dashboard según hora (Madrid) y quien ha iniciado sesión. */
export function panelTimeGreeting(user: PanelUser | null): string {
  const h = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: MADRID }).format(new Date()),
  );
  const part = h < 13 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
  return `${part}, ${panelFirstName(user)}`;
}

export function panelTodaySubtitle(): string {
  const raw = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: MADRID,
  }).format(new Date());
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
