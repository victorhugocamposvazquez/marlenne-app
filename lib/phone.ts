import { agoLbl, shortWhen } from '@/lib/time';

export function phoneDigits(s: string) {
  return s.replace(/\D/g, '');
}

export function firstName(full: string) {
  return full.trim().split(/\s+/)[0] || full;
}

/** Enlace de WhatsApp (el del teléfono, no la API). 9 cifras → España. */
export function waHref(phone: string | null | undefined, text?: string): string | null {
  if (!phone) return null;
  const d = phoneDigits(phone);
  if (d.length < 9) return null;
  const intl = d.length === 9 ? `34${d}` : d.replace(/^00/, '');
  const base = `https://wa.me/${intl}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function waConfirmMsg(input: {
  clientLabel: string;
  service: string;
  startsAt: string;
  confirmUrl?: string | null;
}) {
  const name = firstName(input.clientLabel);
  const when = shortWhen(input.startsAt);
  const base = `Hola ${name}, te confirmo tu cita el ${when} para ${input.service}. ¿Vienes?`;
  return input.confirmUrl
    ? `${base}\n\nConfirma aquí (sí o no): ${input.confirmUrl}`
    : `${base} Respóndeme sí o no, porfa.`;
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
