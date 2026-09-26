/** Ventana inicial en el servidor (rápida) vs tira completa (segundo plano). */
export const AGENDA_BUSY_INITIAL_BACK = 21;
export const AGENDA_BUSY_INITIAL_FORWARD = 21;

/** Coincide con DayStrip (PAST / FUTURE). */
export const AGENDA_BUSY_STRIP_PAST = 90;
export const AGENDA_BUSY_STRIP_FUTURE = 180;

export function agendaBusyInitialStart(selectedDay: number) {
  return selectedDay - AGENDA_BUSY_INITIAL_BACK;
}

export function agendaBusyInitialCount() {
  return AGENDA_BUSY_INITIAL_BACK + AGENDA_BUSY_INITIAL_FORWARD + 1;
}

export function agendaBusyStripStart(selectedDay: number, stripStart: number) {
  return Math.min(stripStart, selectedDay) - AGENDA_BUSY_STRIP_PAST;
}

export function agendaBusyStripCount(selectedDay: number, stripStart: number) {
  const from = agendaBusyStripStart(selectedDay, stripStart);
  const to = Math.max(stripStart, selectedDay) + AGENDA_BUSY_STRIP_FUTURE;
  return to - from + 1;
}
