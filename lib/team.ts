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

/** Etiqueta en pickers: el puesto guardado (Cabina 1…) o el nombre si no hay. */
export function providerAgendaLabel(p: Provider): string {
  const title = p.job_title?.trim();
  return title || p.full_name;
}
