import { offsetFromDay } from '@/lib/time';
import { providerShortLabel } from '@/lib/team';

/** Minutos de antelación del aviso al equipo. */
export const STAFF_REMINDER_LEAD_MIN = 30;

/** Quien atiende en el aviso: «Iria García» → «Iria»; «Cabina 2» → «Cabina 2». */
export function providerFirstName(fullName: string): string {
  return providerShortLabel(fullName) || 'el equipo';
}

/**
 * Cuerpo del aviso. El título es siempre Marlén (el «from» del iPhone).
 * «Cita con Manuela Lopez en 30 minutos - con Iria»
 */
export function staffReminderTitle(clientName: string, providerName: string, minutesLeft: number): string {
  const mins = Math.max(1, Math.round(minutesLeft));
  const cuando = mins === 1 ? '1 minuto' : `${mins} minutos`;
  const client = clientName.trim() || 'Sin nombre';
  return `Cita con ${client} en ${cuando} - con ${providerFirstName(providerName)}`;
}

/** Abre la agenda en el día de la cita y con su ficha. Sin día, iOS deja la de hoy y la ficha se cierra. */
export function staffReminderUrl(appointmentId: string, startsAt?: string | Date): string {
  const q = new URLSearchParams();
  if (startsAt) {
    const iso = startsAt instanceof Date ? startsAt.toISOString() : startsAt;
    q.set('day', String(offsetFromDay(iso)));
  }
  q.set('appt', appointmentId);
  return `/agenda?${q.toString()}`;
}

export function minutesUntil(startsAt: Date, now: Date): number {
  return (startsAt.getTime() - now.getTime()) / 60_000;
}

/** Cita programada que empieza dentro de los próximos 30 minutos y aún no ha empezado. */
export function isStaffReminderDue(startsAt: Date, now: Date): boolean {
  const min = minutesUntil(startsAt, now);
  return min > 0 && min <= STAFF_REMINDER_LEAD_MIN;
}
