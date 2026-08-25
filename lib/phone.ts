export function phoneDigits(s: string) {
  return s.replace(/\D/g, '');
}

/** Enlace de WhatsApp (el del teléfono, no la API). 9 cifras → España. */
export function waHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const d = phoneDigits(phone);
  if (d.length < 9) return null;
  const intl = d.length === 9 ? `34${d}` : d.replace(/^00/, '');
  return `https://wa.me/${intl}`;
}
