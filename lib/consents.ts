export const CONSENT_KINDS = {
  fotografia: 'Fotos de tratamiento',
  datos_salud: 'Datos de salud',
  tratamiento: 'Consentimiento de tratamiento',
} as const;

export type ConsentKind = keyof typeof CONSENT_KINDS;

export const BLOCK_REASONS = {
  comida: 'Comida',
  descanso: 'Descanso',
  cabina: 'Cabina ocupada',
  personal: 'Asunto personal',
  vacaciones: 'Vacaciones',
} as const;

export type BlockReason = keyof typeof BLOCK_REASONS;
