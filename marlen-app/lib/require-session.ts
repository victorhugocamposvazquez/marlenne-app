import { redirect } from 'next/navigation';
import { getSession } from '@/lib/queries';
import type { StaffRole } from '@/lib/types';

/** El layout y la página se ejecutan en paralelo: no basta con redirigir solo en el layout. */
export async function requireSession() {
  const me = await getSession();
  if (!me) redirect('/login');
  return me;
}

/** Rutas del centro: en la cuenta personal vuelven a Hoy. */
export async function requireCompany() {
  const me = await requireSession();
  if (me.workspace === 'personal') redirect('/hoy');
  return me;
}

export async function requireRole(...roles: StaffRole[]) {
  const me = await requireCompany();
  if (!roles.includes(me.role)) redirect('/ajustes');
  return me;
}
