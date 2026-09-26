/** Sesión de soporte Ops (panel embebido o enlace con query). Sin DOM. */

export const OPS_SUPPORT_STORAGE = 'marlenne_ops_support';

export type OpsSupportSession = {
  company: string;
  by: string;
  since: number;
  staffName?: string;
  staffRole?: string;
};

/** Banner desde cookie httpOnly (servidor). */
export type OpsActingAs = {
  staffName: string;
  staffRole: string;
  opsEmail: string;
  company: string;
};

export function parseOpsSupportSession(raw: string | null): OpsSupportSession | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as OpsSupportSession;
    if (!o?.company || !o.by) return null;
    return o;
  } catch {
    return null;
  }
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  reception: 'Recepción',
  provider: 'Profesional',
};

export function staffRoleLabel(role: string) {
  return ROLE_LABEL[role] ?? role;
}
