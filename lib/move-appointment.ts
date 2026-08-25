import { toTimestamp } from '@/lib/time';

export type MoveCode = 'ok' | 'overlap' | 'blocked' | 'forbidden' | 'not_found';

export type MoveResult = { ok: boolean; error: string | null; code?: Exclude<MoveCode, 'ok'> };

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

const MSG: Record<Exclude<MoveCode, 'ok'>, string> = {
  overlap: 'Ese hueco ya está ocupado',
  blocked: 'Ese hueco ya está ocupado',
  forbidden: 'No puedes mover esa cita',
  not_found: 'No se ha podido mover la cita',
};

function asCode(raw: string | null): MoveCode | null {
  if (raw === 'ok' || raw === 'overlap' || raw === 'blocked' || raw === 'forbidden' || raw === 'not_found') {
    return raw;
  }
  return null;
}

/** RPC de Postgres. Sirve en el cliente (Capacitor) y en el servidor (voz). */
export async function moveAppointment(
  sb: RpcClient,
  { id, date, startMin, providerId }: { id: string; date: string; startMin: number; providerId: string },
): Promise<MoveResult> {
  if (!id || !providerId) {
    return { ok: false, error: MSG.not_found, code: 'not_found' };
  }
  const { data, error } = await sb.rpc('move_appointment', {
    p_id: id,
    p_starts_at: toTimestamp(date, startMin),
    p_provider_id: providerId,
  });
  if (error) {
    const msg = error.message ?? '';
    if (/overlap|exclusion|bloqueada/i.test(msg)) {
      return { ok: false, error: MSG.overlap, code: 'overlap' };
    }
    return { ok: false, error: msg || MSG.not_found, code: 'not_found' };
  }
  const code = asCode(typeof data === 'string' ? data : null);
  if (code === 'ok') return { ok: true, error: null };
  if (code) return { ok: false, error: MSG[code], code };
  return { ok: false, error: MSG.not_found, code: 'not_found' };
}
