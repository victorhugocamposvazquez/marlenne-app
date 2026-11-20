import { agoLbl, shortWhen } from '@/lib/time';

export function phoneDigits(s: string) {
  return s.replace(/\D/g, '');
}

export function firstName(full: string) {
  return full.trim().split(/\s+/)[0] || full;
}

/** Número internacional sin + (9 cifras → España). */
export function waIntl(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const d = phoneDigits(phone);
  if (d.length < 9) return null;
  return d.length === 9 ? `34${d}` : d.replace(/^00/, '');
}

/** Enlace web. En iPhone instalado (PWA) a veces no abre la app: usar también `waAppHref`. */
export function waHref(phone: string | null | undefined, text?: string): string | null {
  const intl = waIntl(phone);
  if (!intl) return null;
  const base = `https://wa.me/${intl}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** Esquema nativo. En iPhone con la PWA, wa.me se queda en Safari y el 15/16 se ve distinto. */
export function waAppHref(phone: string | null | undefined, text?: string): string | null {
  const intl = waIntl(phone);
  if (!intl) return null;
  return text
    ? `whatsapp://send?phone=${intl}&text=${encodeURIComponent(text)}`
    : `whatsapp://send?phone=${intl}`;
}

/** Texto de fábrica si el centro no ha guardado el suyo. */
export const DEFAULT_WA_CONFIRM_TEMPLATE =
  'Hola {{cliente}}, te confirmo tu cita el {{cuando}} para {{servicio}}. ¿Vienes?';

const CONFIRM_LINK = 'Confirma aquí (sí o no):';

export function waConfirmMsg(
  input: {
    clientLabel: string;
    service: string;
    startsAt: string;
    confirmUrl?: string | null;
  },
  template?: string | null,
) {
  const name = firstName(input.clientLabel);
  const when = shortWhen(input.startsAt);
  const custom = template?.trim();
  if (!custom) {
    const base = `Hola ${name}, te confirmo tu cita el ${when} para ${input.service}. ¿Vienes?`;
    return input.confirmUrl
      ? `${base}\n\n${CONFIRM_LINK} ${input.confirmUrl}`
      : `${base} Respóndeme sí o no, porfa.`;
  }
  const hasLink = custom.includes('{{enlace}}');
  let text = custom
    .replaceAll('{{cliente}}', name || 'cliente')
    .replaceAll('{{cuando}}', when)
    .replaceAll('{{servicio}}', input.service?.trim() || 'tu cita')
    .replaceAll('{{enlace}}', input.confirmUrl?.trim() || '');
  text = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!hasLink && input.confirmUrl) {
    text = `${text}\n\n${CONFIRM_LINK} ${input.confirmUrl}`;
  }
  return text;
}

export function waWaiterMsg(input: { name: string; service: string; startsAt: string }) {
  const name = firstName(input.name);
  return `Hola ${name}, se ha quedado libre un hueco de ${input.service} ${shortWhen(input.startsAt)}. ¿Te viene?`;
}

export function waRecallMsg(input: { name: string; service?: string | null; lastAt: string }) {
  const name = firstName(input.name);
  const when = agoLbl(input.lastAt);
  const svc = input.service?.trim();
  return svc
    ? `Hola ${name}, ${when} de tu ${svc}. ¿Te damos cita?`
    : `Hola ${name}, ${when} de tu última visita. ¿Te damos cita?`;
}

export function confirmPageUrl(token: string) {
  const origin = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.APP_URL ?? '').replace(/\/$/, '');
  return `${origin}/c/${encodeURIComponent(token)}`;
}
