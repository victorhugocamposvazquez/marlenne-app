import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';
import { BRAND_NAME } from '@/lib/brand';
import {
  isStaffReminderDue,
  minutesUntil,
  STAFF_REMINDER_LEAD_MIN,
  staffReminderTitle,
  staffReminderUrl,
} from '@/lib/staff-reminder';

type PushSub = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  staff_id: string;
};

type DueRow = {
  id: string;
  salon_id: string;
  starts_at: string;
  client_name: string | null;
  client: { full_name?: string } | { full_name?: string }[] | null;
  provider: { full_name?: string } | { full_name?: string }[] | null;
};

export type StaffReminderResult = {
  ok: boolean;
  due: number;
  sent: number;
  error?: string;
  hint?: string;
};

function rel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function vapidPublicKey(): string | null {
  const key = process.env.VAPID_PUBLIC_KEY?.trim();
  return key || null;
}

function vapidReady(): boolean {
  return Boolean(vapidPublicKey() && process.env.VAPID_PRIVATE_KEY?.trim());
}

function configureWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT?.trim() || 'mailto:hola@marlen.app',
    vapidPublicKey()!,
    process.env.VAPID_PRIVATE_KEY!.trim(),
  );
}

function gone(err: unknown): boolean {
  const status = (err as { statusCode?: number }).statusCode;
  return status === 404 || status === 410;
}

async function loadActiveSubs(salonId: string): Promise<PushSub[]> {
  const supabase = createAdminClient();
  const [{ data: subs, error }, { data: staff, error: staffError }] = await Promise.all([
    supabase
      .from('staff_push_subscriptions')
      .select('id, endpoint, p256dh, auth, staff_id')
      .eq('salon_id', salonId),
    supabase.from('staff').select('id').eq('salon_id', salonId).eq('is_active', true).eq('notify_upcoming', true),
  ]);
  if (error) throw new Error(error.message);
  if (staffError) throw new Error(staffError.message);
  const active = new Set((staff ?? []).map(row => row.id as string));
  return ((subs ?? []) as PushSub[]).filter(sub => active.has(sub.staff_id));
}

async function claim(id: string, now: Date): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('appointments')
    .update({ staff_reminded_at: now.toISOString() })
    .eq('id', id)
    .is('staff_reminded_at', null)
    .select('id');
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

async function unclaim(id: string) {
  const supabase = createAdminClient();
  await supabase.from('appointments').update({ staff_reminded_at: null }).eq('id', id);
}

async function pushOne(sub: PushSub, payload: string): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
      { TTL: 20 * 60, urgency: 'high' },
    );
    return true;
  } catch (err) {
    if (gone(err)) {
      const supabase = createAdminClient();
      await supabase.from('staff_push_subscriptions').delete().eq('id', sub.id);
    }
    return false;
  }
}

/** Envía el aviso de las citas que entran en la ventana de 30 minutos. */
export async function dispatchStaffReminders(opts?: {
  salonId?: string;
  now?: Date;
  appointmentIds?: string[];
}): Promise<StaffReminderResult> {
  if (!vapidReady()) {
    return {
      ok: false,
      due: 0,
      sent: 0,
      error: 'Faltan VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY',
    };
  }

  configureWebPush();
  const now = opts?.now ?? new Date();
  const force = Boolean(opts?.appointmentIds?.length);
  const horizon = new Date(now.getTime() + STAFF_REMINDER_LEAD_MIN * 60_000);
  const supabase = createAdminClient();

  let query = supabase
    .from('appointments')
    .select('id, salon_id, starts_at, client_name, client:clients(full_name), provider:staff!appointments_provider_id_fkey(full_name)')
    .eq('status', 'prog');
  if (opts?.salonId) query = query.eq('salon_id', opts.salonId);
  if (force) {
    query = query.in('id', opts!.appointmentIds!);
  } else {
    query = query
      .is('staff_reminded_at', null)
      .gt('starts_at', now.toISOString())
      .lte('starts_at', horizon.toISOString());
  }

  const { data, error } = await query;
  if (error) return { ok: false, due: 0, sent: 0, error: error.message };

  const due = ((data ?? []) as DueRow[]).filter(row => (
    force || isStaffReminderDue(new Date(row.starts_at), now)
  ));
  if (due.length === 0) return { ok: true, due: 0, sent: 0 };

  const subsBySalon = new Map<string, PushSub[]>();
  for (const salonId of new Set(due.map(row => row.salon_id))) {
    subsBySalon.set(salonId, await loadActiveSubs(salonId));
  }

  let sent = 0;
  let skippedNoSubs = 0;
  for (const row of due) {
    const subs = subsBySalon.get(row.salon_id) ?? [];
    if (subs.length === 0) {
      skippedNoSubs += 1;
      continue;
    }

    const claimed = await claim(row.id, now);
    if (!claimed) continue;

    const title = staffReminderTitle(
      rel(row.client)?.full_name || row.client_name || '',
      rel(row.provider)?.full_name || '',
      minutesUntil(new Date(row.starts_at), now),
    );
    const payload = JSON.stringify({
      title: BRAND_NAME,
      body: title,
      url: staffReminderUrl(row.id, row.starts_at),
      tag: `staff-appt-${row.id}`,
    });

    let delivered = 0;
    for (const sub of subs) {
      if (await pushOne(sub, payload)) delivered += 1;
    }
    if (delivered === 0) {
      await unclaim(row.id);
      continue;
    }
    sent += 1;
  }

  return {
    ok: true,
    due: due.length,
    sent,
    hint: skippedNoSubs > 0
      ? 'Hay citas a 30 minutos, pero nadie del equipo tiene avisos activados en un teléfono.'
      : sent === 0 && due.length > 0
        ? 'Había citas, pero el aviso no llegó a ningún teléfono.'
        : undefined,
  };
}

type DueTask = {
  id: string;
  user_id: string;
  title: string;
  remind_at: string;
};

async function claimTask(id: string, now: Date): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('personal_tasks')
    .update({ reminded_at: now.toISOString() })
    .eq('id', id)
    .is('reminded_at', null)
    .select('id');
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

async function unclaimTask(id: string) {
  const supabase = createAdminClient();
  await supabase.from('personal_tasks').update({ reminded_at: null }).eq('id', id);
}

async function loadSubsForStaff(staffId: string): Promise<PushSub[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('staff_push_subscriptions')
    .select('id, endpoint, p256dh, auth, staff_id')
    .eq('staff_id', staffId);
  if (error) throw new Error(error.message);
  return (data ?? []) as PushSub[];
}

/** Aviso de tareas personales cuyo remind_at ya ha pasado. */
export async function dispatchPersonalTaskReminders(opts?: {
  userId?: string;
  now?: Date;
}): Promise<StaffReminderResult> {
  if (!vapidReady()) {
    return { ok: false, due: 0, sent: 0, error: 'Faltan VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY' };
  }
  configureWebPush();
  const now = opts?.now ?? new Date();
  const supabase = createAdminClient();
  let query = supabase
    .from('personal_tasks')
    .select('id, user_id, title, remind_at')
    .is('done_at', null)
    .is('reminded_at', null)
    .lte('remind_at', now.toISOString())
    .limit(80);
  if (opts?.userId) query = query.eq('user_id', opts.userId);

  const { data, error } = await query;
  if (error) {
    if (/personal_tasks|does not exist|schema cache/i.test(error.message)) {
      return { ok: true, due: 0, sent: 0 };
    }
    return { ok: false, due: 0, sent: 0, error: error.message };
  }

  const due = (data ?? []) as DueTask[];
  if (due.length === 0) return { ok: true, due: 0, sent: 0 };

  let sent = 0;
  for (const row of due) {
    const subs = await loadSubsForStaff(row.user_id);
    if (subs.length === 0) continue;
    const claimed = await claimTask(row.id, now);
    if (!claimed) continue;
    const payload = JSON.stringify({
      title: BRAND_NAME,
      body: row.title,
      url: '/hoy',
      tag: `personal-task-${row.id}`,
    });
    let delivered = 0;
    for (const sub of subs) {
      if (await pushOne(sub, payload)) delivered += 1;
    }
    if (delivered === 0) {
      await unclaimTask(row.id);
      continue;
    }
    sent += 1;
  }
  return { ok: true, due: due.length, sent };
}

type DueSalonTask = {
  id: string;
  salon_id: string;
  created_by: string;
  assignee_staff_id: string | null;
  title: string;
  remind_at: string;
};

async function claimSalonTask(id: string, now: Date): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('salon_tasks')
    .update({ reminded_at: now.toISOString() })
    .eq('id', id)
    .is('reminded_at', null)
    .select('id');
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

async function unclaimSalonTask(id: string) {
  const supabase = createAdminClient();
  await supabase.from('salon_tasks').update({ reminded_at: null }).eq('id', id);
}

/** Aviso de tareas del centro cuyo remind_at ya ha pasado. */
export async function dispatchSalonTaskReminders(opts?: {
  salonId?: string;
  staffId?: string;
  now?: Date;
}): Promise<StaffReminderResult> {
  if (!vapidReady()) {
    return { ok: false, due: 0, sent: 0, error: 'Faltan VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY' };
  }
  configureWebPush();
  const now = opts?.now ?? new Date();
  const supabase = createAdminClient();
  let query = supabase
    .from('salon_tasks')
    .select('id, salon_id, created_by, assignee_staff_id, title, remind_at')
    .is('done_at', null)
    .is('reminded_at', null)
    .lte('remind_at', now.toISOString())
    .limit(80);
  if (opts?.salonId) query = query.eq('salon_id', opts.salonId);

  const { data, error } = await query;
  if (error) {
    if (/salon_tasks|does not exist|schema cache/i.test(error.message)) {
      return { ok: true, due: 0, sent: 0 };
    }
    return { ok: false, due: 0, sent: 0, error: error.message };
  }

  let due = (data ?? []) as DueSalonTask[];
  if (opts?.staffId) {
    due = due.filter(t =>
      (t.assignee_staff_id ?? t.created_by) === opts.staffId,
    );
  }
  if (due.length === 0) return { ok: true, due: 0, sent: 0 };

  let sent = 0;
  for (const row of due) {
    const targetStaffId = row.assignee_staff_id ?? row.created_by;
    const subs = await loadSubsForStaff(targetStaffId);
    if (subs.length === 0) continue;
    const claimed = await claimSalonTask(row.id, now);
    if (!claimed) continue;
    const payload = JSON.stringify({
      title: BRAND_NAME,
      body: row.title,
      url: '/tareas',
      tag: `salon-task-${row.id}`,
    });
    let delivered = 0;
    for (const sub of subs) {
      if (await pushOne(sub, payload)) delivered += 1;
    }
    if (delivered === 0) {
      await unclaimSalonTask(row.id);
      continue;
    }
    sent += 1;
  }
  return { ok: true, due: due.length, sent };
}
