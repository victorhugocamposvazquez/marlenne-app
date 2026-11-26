import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  leadPushCopy,
  leadPushTag,
  leadPushUrl,
  META_PUSH_BADGE,
  META_PUSH_ICON,
} from '@/lib/leads';

type PushSub = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function vapidReady() {
  return Boolean(process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim());
}

function gone(err: unknown) {
  const status = (err as { statusCode?: number }).statusCode;
  return status === 404 || status === 410;
}

/** Aviso a recepción y admin. El toque abre la ficha de ese lead. */
export async function notifyNewLead(input: {
  salonId: string;
  leadId: string;
  name: string;
  campaign?: string | null;
  ad?: string | null;
  phone?: string | null;
  /** Formulario de anuncios de Meta (webhook o import con id de Meta). */
  fromMeta?: boolean;
}): Promise<{ sent: number }> {
  if (!vapidReady()) return { sent: 0 };
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT?.trim() || 'mailto:hola@marlen.app',
    process.env.VAPID_PUBLIC_KEY!.trim(),
    process.env.VAPID_PRIVATE_KEY!.trim(),
  );

  const sb = createAdminClient();
  const { data: staff, error: staffError } = await sb
    .from('staff')
    .select('id')
    .eq('salon_id', input.salonId)
    .eq('is_active', true)
    .in('role', ['admin', 'reception']);
  if (staffError || !staff?.length) return { sent: 0 };

  const ids = staff.map(row => row.id as string);
  const { data: subs, error } = await sb
    .from('staff_push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('salon_id', input.salonId)
    .in('staff_id', ids);
  if (error || !subs?.length) return { sent: 0 };

  const fromMeta = input.fromMeta === true;
  const copy = leadPushCopy({ ...input, fromMeta });
  const payload = JSON.stringify({
    title: copy.title,
    body: copy.body,
    url: leadPushUrl(input.leadId),
    tag: leadPushTag(input.leadId, fromMeta),
    ...(fromMeta
      ? { icon: META_PUSH_ICON, badge: META_PUSH_BADGE }
      : {}),
  });

  let sent = 0;
  await Promise.all((subs as PushSub[]).map(async sub => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 60 * 60, urgency: 'high' },
      );
      sent += 1;
    } catch (err) {
      if (gone(err)) {
        await sb.from('staff_push_subscriptions').delete().eq('id', sub.id);
      }
    }
  }));
  return { sent };
}
