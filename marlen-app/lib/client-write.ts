import type { SupabaseClient } from '@supabase/supabase-js';

export type ClientWriteResult = { ok: boolean; error: string | null; id?: string | null };

async function salonOf(sb: SupabaseClient) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { user: null, salonId: null as string | null };
  const { data } = await sb.from('staff').select('salon_id').eq('id', user.id).maybeSingle();
  return { user, salonId: data?.salon_id ?? null };
}

export async function createClientRecord(
  sb: SupabaseClient,
  input: { full_name: string; phone?: string; email?: string; tags?: string[] },
): Promise<ClientWriteResult> {
  const name = input.full_name.trim();
  if (name.length < 2) return { ok: false, error: 'Pon al menos el nombre', id: null };
  const { salonId } = await salonOf(sb);
  if (!salonId) return { ok: false, error: 'Sin sesión', id: null };

  const tel = (input.phone ?? '').replace(/\D/g, '');
  if (tel.length >= 9) {
    const tail = tel.slice(-9);
    const { data: same } = await sb
      .from('clients')
      .select('id, full_name, phone')
      .eq('salon_id', salonId)
      .ilike('phone', `%${tail}%`);
    const hit = (same ?? []).find(c => (c.phone ?? '').replace(/\D/g, '').endsWith(tail));
    if (hit) {
      return {
        ok: false,
        error: `Ese teléfono ya es de ${hit.full_name}. Ábrela en vez de duplicar.`,
        id: hit.id,
      };
    }
  }

  const { data, error } = await sb.from('clients').insert({
    salon_id: salonId,
    full_name: name,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    tags: input.tags ?? [],
  }).select('id').single();

  return { ok: !error, error: error?.message ?? null, id: data?.id ?? null };
}

export async function updateClientRecord(
  sb: SupabaseClient,
  input: {
    id: string;
    full_name: string;
    phone?: string;
    email?: string;
    notes?: string;
    tags?: string[];
    sms_opt_in?: boolean;
    birth_date?: string | null;
  },
): Promise<ClientWriteResult> {
  const name = input.full_name.trim();
  if (name.length < 2) return { ok: false, error: 'Pon al menos el nombre' };
  const { salonId } = await salonOf(sb);
  if (!salonId) return { ok: false, error: 'Sin sesión' };

  const { error } = await sb.from('clients').update({
    full_name: name,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    notes: input.notes?.trim() || null,
    tags: input.tags ?? [],
    sms_opt_in: input.sms_opt_in ?? true,
    birth_date: input.birth_date?.trim() || null,
  }).eq('id', input.id);

  return { ok: !error, error: error?.message ?? null };
}

export async function patchClientNotes(
  sb: SupabaseClient,
  id: string,
  notes: string,
): Promise<ClientWriteResult> {
  const { salonId } = await salonOf(sb);
  if (!salonId) return { ok: false, error: 'Sin sesión' };
  const { error } = await sb.from('clients').update({ notes: notes.trim() || null }).eq('id', id);
  return { ok: !error, error: error?.message ?? null };
}

const STORAGE_CHUNK = 50;

/** Borra ficha, fotos de Storage, tratamientos y consentimientos. Las citas se quedan con el nombre. */
export async function deleteClientRecord(
  sb: SupabaseClient,
  id: string,
): Promise<ClientWriteResult> {
  const { salonId } = await salonOf(sb);
  if (!salonId) return { ok: false, error: 'Sin sesión' };

  const { data: client, error: foundErr } = await sb
    .from('clients')
    .select('id, full_name')
    .eq('id', id)
    .maybeSingle();
  if (foundErr) return { ok: false, error: foundErr.message };
  if (!client) return { ok: false, error: 'No está esta ficha' };

  const { data: treatments, error: txErr } = await sb
    .from('treatments')
    .select('id')
    .eq('client_id', id);
  if (txErr) return { ok: false, error: txErr.message };

  const txIds = (treatments ?? []).map(t => t.id);
  let paths: string[] = [];
  if (txIds.length) {
    const { data: photos, error: phErr } = await sb
      .from('treatment_photos')
      .select('storage_path')
      .in('treatment_id', txIds);
    if (phErr) return { ok: false, error: phErr.message };
    paths = (photos ?? []).map(p => p.storage_path).filter(Boolean);
  }

  // Hay que borrar Storage con los tratamientos aún vivos: la política mira esa fila.
  for (let i = 0; i < paths.length; i += STORAGE_CHUNK) {
    const { error: stErr } = await sb.storage
      .from('treatment-photos')
      .remove(paths.slice(i, i + STORAGE_CHUNK));
    if (stErr) return { ok: false, error: stErr.message };
  }

  const { error: stampErr } = await sb
    .from('appointments')
    .update({ client_name: client.full_name })
    .eq('client_id', id);
  if (stampErr) return { ok: false, error: stampErr.message };

  const { error } = await sb.from('clients').delete().eq('id', id);
  return { ok: !error, error: error?.message ?? null };
}

export async function updateTreatment(
  sb: SupabaseClient,
  input: { id: string; note?: string | null; zone?: string | null; sessions_total?: number },
): Promise<ClientWriteResult> {
  const { salonId } = await salonOf(sb);
  if (!salonId) return { ok: false, error: 'Sin sesión' };
  const patch: Record<string, unknown> = {};
  if (input.note !== undefined) patch.note = input.note?.trim() || null;
  if (input.zone !== undefined) patch.zone = input.zone?.trim() || null;
  if (input.sessions_total !== undefined) {
    if (input.sessions_total < 1) return { ok: false, error: 'Pon al menos una sesión' };
    patch.sessions_total = input.sessions_total;
  }
  if (!Object.keys(patch).length) return { ok: true, error: null };
  const { error } = await sb.from('treatments').update(patch).eq('id', input.id);
  return { ok: !error, error: error?.message ?? null };
}

export async function addConsent(
  sb: SupabaseClient,
  input: { clientId: string; kind: string },
): Promise<ClientWriteResult> {
  const { user, salonId } = await salonOf(sb);
  if (!salonId || !user) return { ok: false, error: 'Sin sesión' };
  const expires = input.kind === 'fotografia'
    ? new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    : null;
  const { error } = await sb.from('consents').insert({
    client_id: input.clientId,
    kind: input.kind,
    taken_by: user.id,
    expires_at: expires,
  });
  return { ok: !error, error: error?.message ?? null };
}
