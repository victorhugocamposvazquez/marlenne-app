export const CONSENT_KINDS = {
  fotografia: 'Fotos de tratamiento',
  datos_salud: 'Datos de salud',
  tratamiento: 'Consentimiento de tratamiento',
} as const;

export type ConsentKind = keyof typeof CONSENT_KINDS;

export const CONSENT_COPY: Record<ConsentKind, string> = {
  fotografia:
    'La clienta autoriza fotos de antes/después solo para su ficha clínica. No se publican ni se ceden. Se puede retirar cuando quiera.',
  datos_salud:
    'La clienta autoriza que el centro trate medidas, notas y parámetros de sesión como datos de salud (RGPD art. 9), solo para el tratamiento.',
  tratamiento:
    'La clienta declara haber sido informada del tratamiento, riesgos habituales y que consiente que se realice en el centro.',
};

export const BLOCK_REASONS = {
  comida: 'Comida',
  descanso: 'Descanso',
  cabina: 'Cabina ocupada',
  personal: 'Asunto personal',
  vacaciones: 'Vacaciones',
} as const;

export type BlockReason = keyof typeof BLOCK_REASONS;
