'use server';

import { revalidatePath } from 'next/cache';
import { personalSalonIdFromPrefs } from '@/lib/personal-tasks';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { WorkspaceKind } from '@/lib/personal-tasks';

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
  throw new Error(error?.message ?? 'No se ha podido crear la cuenta personal.');
}

/** Cambia trabajo ↔ personal. Rápido: sin getSession ni ensure si ya hay personal_salon_id. */
export async function setWorkspace(
  next: WorkspaceKind,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: 'Sesión caducada.' };

  const { data: row } = await sb
    .from('staff')
    .select('full_name, app_prefs')
    .eq('id', user.id)
    .maybeSingle();
  if (!row) return { ok: false, error: 'Sesión caducada.' };

  let personalId = personalSalonIdFromPrefs(row.app_prefs);

  // Solo crear/buscar salón personal la primera vez que se entra a personal.
  if (next === 'personal' && !personalId) {
    try {
      personalId = await ensurePersonalSalon(user.id, (row.full_name as string) ?? '');
    } catch {
      return { ok: false, error: 'No se ha podido abrir la cuenta personal.' };
    }
  }

  const patch: { workspace: WorkspaceKind; personal_salon_id?: string } = { workspace: next };
  if (personalId) patch.personal_salon_id = personalId;

  const { error } = await sb.rpc('merge_my_app_prefs', { patch });
  if (error) return { ok: false, error: 'No se ha podido cambiar de cuenta.' };

  revalidatePath('/', 'layout');
  return { ok: true };
}
