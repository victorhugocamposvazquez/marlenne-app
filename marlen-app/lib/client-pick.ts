import { fold } from '@/lib/voice';
import type { ClientOption } from '@/lib/types';

/** Filtra por nombre o teléfono. Sin texto, devuelve todas: la lista no se esconde. */
export function filterClientOptions(clients: ClientOption[], query: string): ClientOption[] {
  const q = fold(query);
  const digits = query.replace(/\D/g, '');
  if (!q && digits.length < 3) return clients;
  return clients.filter(c =>
    (q && fold(c.full_name).includes(q)) ||
    (digits.length >= 3 && (c.phone ?? '').includes(digits)),
  );
}
