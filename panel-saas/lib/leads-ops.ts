import { panelAdmin } from '@/lib/supabase-admin';

export type OpsLeadFlag = {
  id: string;
  name: string;
  enabled: boolean;
  pageId: string | null;
  pageName: string | null;
  hasToken: boolean;
};

export type OpsLeadFlags = {
  ready: boolean;
  missing: boolean;
  rows: OpsLeadFlag[];
};

/** Centros reales (no el espacio personal). El interruptor vive en `salons.feature_leads`. */
export async function loadCompanyLeadsFlags(): Promise<OpsLeadFlags> {
  const sb = panelAdmin();
  if (!sb) return { ready: false, missing: false, rows: [] };
  const { data, error } = await sb
    .from('salons')
    .select('id, name, kind, feature_leads')
    .order('name');
  if (error) {
    const missing = /feature_leads/i.test(error.message);
    return { ready: false, missing, rows: [] };
  }
  const ids = (data ?? []).filter(row => row.kind !== 'personal').map(row => row.id as string);
  const pages = new Map<string, { pageId: string; pageName: string | null; hasToken: boolean }>();
  if (ids.length) {
    const { data: conns, error: connError } = await sb
      .from('meta_connections')
      .select('salon_id, page_id, page_name, page_access_token')
      .in('salon_id', ids);
    if (connError && !/meta_connections/i.test(connError.message)) {
      return { ready: false, missing: false, rows: [] };
    }
    if (!connError) {
      for (const conn of conns ?? []) {
        const token = (conn.page_access_token as string | null)?.trim();
        pages.set(conn.salon_id as string, {
          pageId: conn.page_id as string,
          pageName: (conn.page_name as string | null) ?? null,
          hasToken: Boolean(token),
        });
      }
    }
  }
  const rows = (data ?? [])
    .filter(row => row.kind !== 'personal')
    .map(row => {
      const page = pages.get(row.id as string);
      return {
        id: row.id as string,
        name: (row.name as string | null)?.trim() || 'Centro',
        enabled: row.feature_leads === true,
        pageId: page?.pageId ?? null,
        pageName: page?.pageName ?? null,
        hasToken: page?.hasToken === true,
      };
    });
  return { ready: true, missing: false, rows };
}
