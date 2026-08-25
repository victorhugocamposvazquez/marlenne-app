import { redirect } from 'next/navigation';
import { getSession } from '@/lib/queries';

/** El layout y la página se ejecutan en paralelo: no basta con redirigir solo en el layout. */
export async function requireSession() {
  const me = await getSession();
  if (!me) redirect('/login');
  return me;
}
