'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/queries';
import {
  dueTimestamp,
  personalSalonIdFromPrefs,
  remindTimestamp,
  type RemindChoice,
} from '@/lib/personal-tasks';
import type { TaskFilter, TaskScope, UnifiedTask } from '@/lib/tasks';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

function refresh() {
  revalidatePath('/hoy');
  revalidatePath('/tareas');
  revalidatePath('/calendario');
}

async function ensurePersonalSalon(userId: string, fullName: string): Promise<string> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('salons')
    .select('id')
    .eq('kind', 'personal')
    .eq('owner_user_id', userId)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data, error } = await admin
    .from('salons')
    .insert({
      name: fullName.trim() || 'Personal',
      kind: 'personal',
      owner_user_id: userId,
      timezone: 'Europe/Madrid',
    })
    .select('id')
    .single();

  if (data?.id) return data.id as string;
  if (error?.code === '23505') {
    const { data: again } = await admin
      .from('salons')
      .select('id')
      .eq('kind', 'personal')
      .eq('owner_user_id', userId)
      .maybeSingle();
    if (again?.id) return again.id as string;
  }
  throw new Error(error?.message ?? 'No se ha podido crear el espacio personal.');
}

async function resolvePersonalSalonId(userId: string, fullName: string, prefs: unknown): Promise<string> {
  const fromPrefs = personalSalonIdFromPrefs(prefs);
  if (fromPrefs) return fromPrefs;
  const id = await ensurePersonalSalon(userId, fullName);
  const sb = createClient();
  await sb.rpc('merge_my_app_prefs', { patch: { personal_salon_id: id } });
  return id;
}

function mapPersonal(row: Record<string, unknown>): UnifiedTask {
  return {
    id: row.id as string,
    scope: 'personal',
    title: row.title as string,
    note: (row.note as string | null) ?? null,
    due_at: (row.due_at as string | null) ?? null,
    done_at: (row.done_at as string | null) ?? null,
    remind_at: (row.remind_at as string | null) ?? null,
    assignee_staff_id: null,
    assignee_name: null,
  };
}

function mapSalon(row: Record<string, unknown>, names: Map<string, string>): UnifiedTask {
  const assignee = (row.assignee_staff_id as string | null) ?? null;
  return {
    id: row.id as string,
    scope: 'centro',
    title: row.title as string,
    note: (row.note as string | null) ?? null,
    due_at: (row.due_at as string | null) ?? null,
    done_at: (row.done_at as string | null) ?? null,
    remind_at: (row.remind_at as string | null) ?? null,
    assignee_staff_id: assignee,
    assignee_name: assignee ? (names.get(assignee) ?? null) : null,
  };
}

export async function listUnifiedTasks(filter: TaskFilter = 'todas'): Promise<UnifiedTask[]> {
  const me = await getSession();
  if (!me) return [];
  const sb = createClient();
  const out: UnifiedTask[] = [];

  if (filter === 'todas' || filter === 'centro') {
    const { data } = await sb
      .from('salon_tasks')
      .select('id, title, note, due_at, done_at, remind_at, assignee_staff_id, sort_order')
      .eq('salon_id', me.salon_id)
      .order('created_at', { ascending: false })
      .limit(400);
    const ids = [...new Set((data ?? []).map(r => r.assignee_staff_id).filter(Boolean))] as string[];
    const names = new Map<string, string>();
    if (ids.length) {
      const { data: staff } = await sb.from('staff').select('id, full_name').in('id', ids);
      for (const s of staff ?? []) names.set(s.id as string, s.full_name as string);
    }
    for (const row of data ?? []) out.push(mapSalon(row as Record<string, unknown>, names));
  }

  if (filter === 'todas' || filter === 'personal') {
    const { data } = await sb
      .from('personal_tasks')
      .select('id, title, note, due_at, done_at, remind_at, sort_order')
      .eq('user_id', me.id)
      .order('created_at', { ascending: false })
      .limit(300);
    for (const row of data ?? []) out.push(mapPersonal(row as Record<string, unknown>));
  }

  return out;
}

export async function getUnifiedTask(
  id: string,
  scope: TaskScope,
): Promise<UnifiedTask | null> {
  const me = await getSession();
  if (!me) return null;
  const sb = createClient();
  if (scope === 'personal') {
    const { data } = await sb
      .from('personal_tasks')
      .select('id, title, note, due_at, done_at, remind_at')
      .eq('id', id)
      .eq('user_id', me.id)
      .maybeSingle();
    return data ? mapPersonal(data as Record<string, unknown>) : null;
  }
  const { data } = await sb
    .from('salon_tasks')
    .select('id, title, note, due_at, done_at, remind_at, assignee_staff_id')
    .eq('id', id)
    .eq('salon_id', me.salon_id)
    .maybeSingle();
  if (!data) return null;
  const names = new Map<string, string>();
  if (data.assignee_staff_id) {
    const { data: staff } = await sb
      .from('staff')
      .select('id, full_name')
      .eq('id', data.assignee_staff_id)
      .maybeSingle();
    if (staff) names.set(staff.id as string, staff.full_name as string);
  }
  return mapSalon(data as Record<string, unknown>, names);
}

export async function saveUnifiedTask(input: {
  id?: string;
  scope: TaskScope;
  title: string;
  note?: string;
  date?: string;
  time?: string;
  remind?: RemindChoice;
  assignee_staff_id?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await getSession();
  if (!me) return { ok: false, error: 'Sesión caducada.' };

  const title = input.title.trim();
  if (title.length < 1) return { ok: false, error: 'Escribe la tarea.' };
  if (title.length > 200) return { ok: false, error: 'El título es demasiado largo.' };

  const date = (input.date ?? '').trim();
  const time = (input.time ?? '').trim();
  const hasTime = /^\d{1,2}:\d{2}$/.test(time);
  const dueAt = date ? dueTimestamp(date, hasTime ? time : '') : null;
  const remind = remindTimestamp(dueAt, input.remind ?? 'none', hasTime);
  const note = (input.note ?? '').trim() || null;
  const sb = createClient();

  if (input.scope === 'personal') {
    const { data: row } = await sb.from('staff').select('app_prefs, full_name').eq('id', me.id).maybeSingle();
    let salonId: string;
    try {
      salonId = await resolvePersonalSalonId(me.id, (row?.full_name as string) ?? me.full_name, row?.app_prefs);
    } catch {
      return { ok: false, error: 'No se ha podido abrir el espacio personal.' };
    }

    if (input.id) {
      const { error } = await sb
        .from('personal_tasks')
        .update({ title, note, due_at: dueAt, remind_at: remind, reminded_at: null })
        .eq('id', input.id)
        .eq('user_id', me.id);
      if (error) return { ok: false, error: 'No se ha podido guardar.' };
    } else {
      const { error } = await sb.from('personal_tasks').insert({
        salon_id: salonId,
        user_id: me.id,
        title,
        note,
        due_at: dueAt,
        remind_at: remind,
      });
      if (error) return { ok: false, error: 'No se ha podido guardar.' };
    }
  } else {
    const assignee = input.assignee_staff_id || me.id;
    if (input.id) {
      const { error } = await sb
        .from('salon_tasks')
        .update({
          title,
          note,
          due_at: dueAt,
          remind_at: remind,
          reminded_at: null,
          assignee_staff_id: assignee,
        })
        .eq('id', input.id)
        .eq('salon_id', me.salon_id);
      if (error) return { ok: false, error: 'No se ha podido guardar.' };
    } else {
      const { error } = await sb.from('salon_tasks').insert({
        salon_id: me.salon_id,
        created_by: me.id,
        assignee_staff_id: assignee,
        title,
        note,
        due_at: dueAt,
        remind_at: remind,
      });
      if (error) return { ok: false, error: 'No se ha podido guardar.' };
    }
  }

  refresh();
  return { ok: true };
}

export async function setUnifiedTaskDone(
  id: string,
  scope: TaskScope,
  done: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await getSession();
  if (!me) return { ok: false, error: 'Sesión caducada.' };
  const sb = createClient();
  const patch = { done_at: done ? new Date().toISOString() : null };
  const { error } = scope === 'personal'
    ? await sb.from('personal_tasks').update(patch).eq('id', id).eq('user_id', me.id)
    : await sb.from('salon_tasks').update(patch).eq('id', id).eq('salon_id', me.salon_id);
  if (error) return { ok: false, error: 'No se ha podido actualizar.' };
  refresh();
  return { ok: true };
}

export async function deleteUnifiedTask(
  id: string,
  scope: TaskScope,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await getSession();
  if (!me) return { ok: false, error: 'Sesión caducada.' };
  const sb = createClient();
  const { error } = scope === 'personal'
    ? await sb.from('personal_tasks').delete().eq('id', id).eq('user_id', me.id)
    : await sb.from('salon_tasks').delete().eq('id', id).eq('salon_id', me.salon_id);
  if (error) return { ok: false, error: 'No se ha podido borrar.' };
  refresh();
  return { ok: true };
}
