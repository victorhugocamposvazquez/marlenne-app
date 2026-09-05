import type { Provider } from '@/lib/types';

/**
 * Columnas de la agenda: las profesionales.
 * Si el centro aún no ha dado de alta ninguna, sale el equipo entero
 * (un admin o recepción solo no puede dejar la grilla a cero).
 */
export function agendaColumns(staff: Provider[]): Provider[] {
  const pros = staff.filter(s => s.role === 'provider');
  return pros.length > 0 ? pros : staff;
}
