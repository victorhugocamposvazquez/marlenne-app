export type NewApptCtaKind = 'client' | 'service' | 'time' | 'save' | 'saving';

/** Texto y acción del botón de alta. Si ya hay hora, guarda; no pide elegirla otra vez. */
export function newAppointmentCta(input: {
  missingClient: boolean;
  missingService: boolean;
  hasTime: boolean;
  pending: boolean;
  step: 'who' | 'when';
}): { label: string; kind: NewApptCtaKind } {
  if (input.pending) return { label: 'Guardando…', kind: 'saving' };
  if (input.missingClient) return { label: 'Elige clienta/e', kind: 'client' };
  if (input.missingService) return { label: 'Elige el servicio', kind: 'service' };
  if (input.hasTime) return { label: 'Guardar cita', kind: 'save' };
  return {
    label: input.step === 'when' ? 'Toca un hueco del día' : 'Elegir hora',
    kind: 'time',
  };
}
