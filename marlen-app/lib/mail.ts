export type SendMailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

export type SendMailResult =
  | { ok: true }
  | { ok: false; error: string };

/** Correo vía Resend. Sin RESEND_API_KEY → error claro. */
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim() || 'Marlén Ops <avisos@marlen.app>';
  if (!apiKey) {
    return { ok: false, error: 'Falta RESEND_API_KEY' };
  }

  const to = Array.isArray(input.to) ? input.to : [input.to];
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { ok: false, error: body || `Resend ${res.status}` };
  }
  return { ok: true };
}

export function opsAlertEmails(): string[] {
  const raw = process.env.OPS_ALERT_EMAIL?.trim() || process.env.MAIL_OPS?.trim() || '';
  return raw
    .split(/[,;\s]+/)
    .map(s => s.trim())
    .filter(Boolean);
}
