/**
 * Alfabeto GSM 03.38, el único que admite un SMS estándar. Todo lo que se sale
 * de aquí obliga a enviar el mensaje en Unicode, donde la capacidad baja de 160
 * a 70 caracteres y un recordatorio normal pasa a costar dos SMS.
 */

const GSM_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';

/** Cuentan como dos caracteres al ir precedidos de un escape. */
const GSM_EXTENDED = '^{}\\[~]|€\f';

const PUNCTUATION_MAP: Record<string, string> = {
  '\u2013': '-',
  '\u2014': '-',
  '\u2012': '-',
  '\u2015': '-',
  '\u2212': '-',
  '\u2018': '\'',
  '\u2019': '\'',
  '\u201A': '\'',
  '\u2032': '\'',
  '\u201C': '"',
  '\u201D': '"',
  '\u201E': '"',
  '\u2033': '"',
  '\u2026': '...',
  '\u00B7': '-',
  '\u2022': '-',
  '\u00AA': 'a',
  '\u00BA': 'o',
  '\u00A0': ' ',
  '\u200B': '',
  '\u2044': '/',
};

function isGsmChar(char: string): boolean {
  return GSM_BASIC.includes(char) || GSM_EXTENDED.includes(char);
}

/** Longitud en caracteres GSM, o null si el texto necesita Unicode. */
export function gsmLength(text: string): number | null {
  let length = 0;
  for (const char of text) {
    if (GSM_BASIC.includes(char)) length += 1;
    else if (GSM_EXTENDED.includes(char)) length += 2;
    else return null;
  }
  return length;
}

/** Sustituye acentos y puntuación tipográfica por equivalentes GSM. */
export function toGsmSafeText(text: string): string {
  let out = '';
  for (const char of text) {
    if (isGsmChar(char)) {
      out += char;
      continue;
    }
    const punctuation = PUNCTUATION_MAP[char];
    if (punctuation !== undefined) {
      out += punctuation;
      continue;
    }
    const stripped = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const replaceable = stripped.length > 0 && [...stripped].every(isGsmChar);
    out += replaceable ? stripped : char;
  }
  return out;
}
