import type { StaffRole } from './types';

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string): string | null {
  const email = normalizeEmail(value);
  if (!email || !email.includes('@') || !email.includes('.')) return 'Pon un email válido';
  return null;
}

export function validatePassword(value: string): string | null {
  if (value.length < 8) return 'Mínimo 8 caracteres';
  return null;
}

export function validateSignIn(input: { email: string; password: string }): string | null {
  return validateEmail(input.email) ?? (input.password ? null : 'Pon la contraseña');
}

export function validateSignUp(input: {
  name: string;
  email: string;
  password: string;
  confirm: string;
}): string | null {
  if (input.name.trim().length < 2) return 'Pon tu nombre';
  return validateEmail(input.email)
    ?? validatePassword(input.password)
    ?? (input.password !== input.confirm ? 'Las contraseñas no coinciden' : null);
}

/** El primero del centro dirige; el resto entra en recepción y dirección les cambia el rol. */
export function signupRole(existingStaff: number): StaffRole {
  return existingStaff <= 0 ? 'admin' : 'reception';
}
