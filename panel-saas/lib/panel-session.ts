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
