'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/queries';
import {
  dueTimestamp,
  personalSalonIdFromPrefs,
  remindTimestamp,
  type PersonalTask,
  type RemindChoice,
} from '@/lib/personal-tasks';
import { createClient } from '@/lib/supabase/server';

function refresh() {
  revalidatePath('/hoy');
  revalidatePath('/calendario');
}

async function personalSalonId(): Promise<string | null> {
  const me = await getSession();
  if (!me) return null;
  const sb = createClient();
  const { data } = await sb.from('staff').select('app_prefs').eq('id', me.id).maybeSingle();
  return personalSalonIdFromPrefs(data?.app_prefs);
}

function mapTask(row: Record<string, unknown>): PersonalTask {
  return {
    id: row.id as string,
    title: row.title as string,
    note: (row.note as string | null) ?? null,
    due_at: (row.due_at as string | null) ?? null,
    done_at: (row.done_at as string | null) ?? null,
    remind_at: (row.remind_at as string | null) ?? null,
    reminded_at: (row.reminded_at as string | null) ?? null,
    sort_order: Number(row.sort_order ?? 0),
  };
}

export async function listPersonalTasks(): Promise<PersonalTask[]> {
  const me = await getSession();
  if (!me || me.workspace !== 'personal') return [];
  const sb = createClient();
  const { data, error } = await sb
    .from('personal_tasks')
    .select('id, title, note, due_at, done_at, remind_at, reminded_at, sort_order')
    .eq('user_id', me.id)
    .order('created_at', { ascending: false })
    .limit(300);
  if (error || !data) return [];
  return data.map(row => mapTask(row as Record<string, unknown>));
}

export async function getPersonalTask(id: string): Promise<PersonalTask | null> {
  const me = await getSession();
  if (!me) return null;
  const sb = createClient();
  const { data } = await sb
    .from('personal_tasks')
    .select('id, title, note, due_at, done_at, remind_at, reminded_at, sort_order')
    .eq('id', id)
    .eq('user_id', me.id)
    .maybeSingle();
  return data ? mapTask(data as Record<string, unknown>) : null;
}

export async function savePersonalTask(input: {
  id?: string;
  title: string;
  note?: string;
  date?: string;
  time?: string;
  remind?: RemindChoice;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await getSession();
  if (!me) return { ok: false, error: 'Sesión caducada.' };
  if (me.workspace !== 'personal') return { ok: false, error: 'Cambia a la cuenta personal.' };

  const title = input.title.trim();
  if (title.length < 1) return { ok: false, error: 'Escribe la tarea.' };
  if (title.length > 200) return { ok: false, error: 'El título es demasiado largo.' };

  const salonId = await personalSalonId();
  if (!salonId) return { ok: false, error: 'Aún no hay cuenta personal.' };

  const date = (input.date ?? '').trim();
  const time = (input.time ?? '').trim();
  const hasTime = /^\d{1,2}:\d{2}$/.test(time);
  const dueAt = date ? dueTimestamp(date, hasTime ? time : '') : null;
  const remind = remindTimestamp(dueAt, input.remind ?? 'none', hasTime);
  const note = (input.note ?? '').trim() || null;

  const sb = createClient();
  if (input.id) {
    const { error } = await sb
      .from('personal_tasks')
      .update({
        title,
        note,
        due_at: dueAt,
        remind_at: remind,
        reminded_at: null,
      })
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

  refresh();
  return { ok: true };
}

export async function setPersonalTaskDone(
  id: string,
  done: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await getSession();
  if (!me) return { ok: false, error: 'Sesión caducada.' };
  const sb = createClient();
  const { error } = await sb
    .from('personal_tasks')
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('user_id', me.id);
  if (error) return { ok: false, error: 'No se ha podido actualizar.' };
  refresh();
  return { ok: true };
}

export async function deletePersonalTask(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await getSession();
  if (!me) return { ok: false, error: 'Sesión caducada.' };
  const sb = createClient();
  const { error } = await sb.from('personal_tasks').delete().eq('id', id).eq('user_id', me.id);
  if (error) return { ok: false, error: 'No se ha podido borrar.' };
  refresh();
  return { ok: true };
}
