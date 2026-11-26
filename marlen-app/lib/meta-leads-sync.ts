/** Recuperar leads ya existentes en Meta, página a página. Sin DOM ni next. */

export const META_LEADS_PAGE = 25;

export type MetaSyncCursor = {
  formAt: number;
  after: string | null;
};

export type GraphPaging = {
  cursors?: { after?: string };
  next?: string;
} | null | undefined;

export function graphAfter(paging: GraphPaging) {
  if (!paging?.next) return null;
  const after = paging.cursors?.after?.trim();
  return after || null;
}

/** Si esta página de un formulario trae más, se queda ahí. Si no, pasa al siguiente. */
export function nextImportCursor(input: {
  formCount: number;
  formAt: number;
  pageAfter: string | null;
}): { done: true } | { done: false; cursor: MetaSyncCursor } {
  if (input.pageAfter) {
    return { done: false, cursor: { formAt: input.formAt, after: input.pageAfter } };
  }
  const next = input.formAt + 1;
  if (next < input.formCount) return { done: false, cursor: { formAt: next, after: null } };
  return { done: true };
}

export function metaLeadWhen(created: string | null | undefined) {
  if (!created?.trim()) return null;
  const time = Date.parse(created);
  if (Number.isNaN(time)) return null;
  return new Date(time).toISOString();
}

/** Un lead de hace más de esto entra en la bandeja, pero no despierta el móvil. */
export const META_LEAD_PUSH_MS = 36 * 60 * 60 * 1000;

export function metaLeadIsFresh(
  created: string | null | undefined,
  now = Date.now(),
  windowMs = META_LEAD_PUSH_MS,
) {
  const iso = metaLeadWhen(created);
  if (!iso) return false;
  return Date.parse(iso) >= now - windowMs;
}

export function newestMetaInstant(times: (string | null | undefined)[]) {
  let newest: string | null = null;
  for (const time of times) {
    const iso = metaLeadWhen(time);
    if (!iso) continue;
    if (!newest || iso > newest) newest = iso;
  }
  return newest;
}

export const TEST_LEAD_FIELDS = [
  { name: 'full_name', values: ['Lead de prueba'] },
  { name: 'phone_number', values: ['+34600000000'] },
  { name: 'email', values: ['prueba@marlenne.test'] },
];
