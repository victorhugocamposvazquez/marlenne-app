/**
 * Teléfono dicho en mostrador: dígitos, «seis uno dos…» o «sin teléfono».
 * Sin DOM: lo usa el diálogo y los tests.
 */

import { fold } from '@/lib/voice';

const DIGIT: Record<string, string> = {
  cero: '0', zero: '0',
  uno: '1', una: '1', un: '1',
  dos: '2',
  tres: '3',
  cuatro: '4',
  cinco: '5',
  seis: '6',
  siete: '7',
  ocho: '8',
  nueve: '9',
};

const SKIP = /^(sin (telefono|movil|numero)|no (tiene|hay) (telefono|movil|numero)|no tiene|ninguno|ningun|nada)$/;

export type PhoneHeard =
  | { kind: 'skip' }
  | { kind: 'ok'; digits: string }
  | { kind: 'bad' };

/** 9 dígitos españoles (móvil o fijo). */
export function looksLikePhone(digits: string) {
  return /^\d{9}$/.test(digits);
}

export function parsePhone(text: string): PhoneHeard {
  const t = fold(text).replace(/[¿?¡!.,]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return { kind: 'bad' };
  if (SKIP.test(t)) return { kind: 'skip' };

  const rawDigits = t.replace(/\D/g, '');
  if (rawDigits.length >= 9) {
    const nine = rawDigits.slice(-9);
    return looksLikePhone(nine) ? { kind: 'ok', digits: nine } : { kind: 'bad' };
  }

  const words = t.split(/\s+/).filter(w => w && w !== 'y' && w !== 'el' && w !== 'numero');
  let digits = '';
  for (const w of words) {
    if (/^\d$/.test(w)) { digits += w; continue; }
    const d = DIGIT[w];
    if (d) { digits += d; continue; }
    if (digits.length) return { kind: 'bad' };
  }
  if (looksLikePhone(digits)) return { kind: 'ok', digits };
  return { kind: 'bad' };
}
