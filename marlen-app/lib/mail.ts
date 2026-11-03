import { createAdminClient } from '@/lib/supabase/admin';
import { brevoApiKey, brevoSendTransactional } from '@/lib/mail/brevo';

export type SendMailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  /** Clasificación en email_log / ops. */
  kind?: string;
  salonId?: string | null;
  tags?: string[];
};

export type SendMailResult =
  | { ok: true; provider: 'brevo'; messageId: string | null }
  | { ok: false; error: string };

async function logEmail(row: {
  provider: 'brevo' | 'resend';
  kind: string;
  toEmail: string;
  subject: string;
  status: 'sent' | 'failed';
  providerMessageId?: string | null;
  error?: string | null;
  salonId?: string | null;
}) {
  try {
    const sb = createAdminClient();
    await sb.from('email_log').insert({
      provider: row.provider,
      kind: row.kind,
      to_email: row.toEmail,
      subject: row.subject,
      status: row.status,
      provider_message_id: row.providerMessageId ?? null,
      error: row.error ?? null,
      salon_id: row.salonId ?? null,
    });
  } catch (e) {
    console.error('[email_log]', e);
  }
}

/** Correo vía Brevo. Requiere BREVO_API_KEY + remitente verificado en MAIL_FROM. */
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  if (!brevoApiKey()) {
    return { ok: false, error: 'Falta BREVO_API_KEY' };
  }

  const to = Array.isArray(input.to) ? input.to : [input.to];
  const kind = input.kind?.trim() || 'generic';
  const r = await brevoSendTransactional({
    to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    tags: input.tags ?? [kind],
  });

  for (const addr of to) {
    await logEmail({
      provider: 'brevo',
      kind,
      toEmail: addr,
      subject: input.subject,
      status: r.ok ? 'sent' : 'failed',
      providerMessageId: r.ok ? r.messageId : null,
      error: r.ok ? null : r.error,
      salonId: input.salonId,
    });
  }

  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, provider: 'brevo', messageId: r.messageId };
}

export function opsAlertEmails(): string[] {
  const raw = process.env.OPS_ALERT_EMAIL?.trim() || process.env.MAIL_OPS?.trim() || '';
  return raw
    .split(/[,;\s]+/)
    .map(s => s.trim())
    .filter(Boolean);
}
