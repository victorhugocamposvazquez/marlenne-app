import { redirect } from 'next/navigation';
import { getSession } from '@/lib/queries';
import type { StaffRole } from '@/lib/types';

/** El layout y la página se ejecutan en paralelo: no basta con redirigir solo en el layout. */
export async function requireSession() {
  const me = await getSession();
  if (!me) redirect('/login');
  return me;
}

/** Rutas del centro (antes bloqueaba workspace personal; ya no hay modo). */
export async function requireCompany() {
  return requireSession();
}

export async function requireRole(...roles: StaffRole[]) {
  const me = await requireCompany();
  if (!roles.includes(me.role)) redirect('/ajustes');
  return me;
}
