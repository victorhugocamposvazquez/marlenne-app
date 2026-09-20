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

/** Etiqueta en pickers: nombre completo tal como está guardado (p. ej. Cabina 1). */
export function providerAgendaLabel(p: Provider): string {
  return p.full_name.trim();
}
