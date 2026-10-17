export type VendorKind = 'amazon_business' | 'meta' | 'manual';

export type VendorConnectionStatus = 'disconnected' | 'connected' | 'error';

export type VendorConnection = {
  vendor: Exclude<VendorKind, 'manual'>;
  status: VendorConnectionStatus;
  externalAccountId: string | null;
  connectedAt: string | null;
  lastError: string | null;
};

export type VendorInvoice = {
  id: string;
  vendor: VendorKind;
  externalId: string | null;
  title: string;
  issuedAt: string;
  periodKey: string;
  amountCents: number | null;
  storagePath: string;
  source: 'upload' | 'amazon_api' | 'meta_api';
};

/** Clave de trimestre: 2026-T3 */
export function periodKeyFromParts(year: number, quarter: 1 | 2 | 3 | 4): string {
  return `${year}-T${quarter}`;
}

export function periodRange(periodKey: string): { from: string; to: string; label: string } {
  const m = /^(\d{4})-T([1-4])$/.exec(periodKey);
  if (!m) {
    const y = new Date().getFullYear();
    return { from: `${y}-01-01`, to: `${y}-03-31`, label: `T1 ${y}` };
  }
  const year = Number(m[1]);
  const q = Number(m[2]) as 1 | 2 | 3 | 4;
  const startMonth = (q - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const lastDay = new Date(Date.UTC(year, endMonth, 0)).getUTCDate();
  return {
    from: `${year}-${String(startMonth).padStart(2, '0')}-01`,
    to: `${year}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    label: `T${q} ${year}`,
  };
}

export function currentPeriodKey(d = new Date()): string {
  const q = (Math.floor(d.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
  return periodKeyFromParts(d.getFullYear(), q);
}

export function periodKeyFromDate(ymd: string): string {
  const [y, m] = ymd.split('-').map(Number);
  const q = (Math.floor((m - 1) / 3) + 1) as 1 | 2 | 3 | 4;
  return periodKeyFromParts(y, q);
}

export function vendorLabel(v: VendorKind): string {
  if (v === 'amazon_business') return 'Amazon Business';
  if (v === 'meta') return 'Meta';
  return 'Manual';
}
