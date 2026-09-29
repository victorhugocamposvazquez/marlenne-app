export type PaymentMethod = 'cash' | 'card' | 'bizum' | 'mixed';

/** Métodos con importe propio (no «mixto»). */
export type SplitMethod = 'cash' | 'card' | 'bizum';

export type PaymentSplit = Partial<Record<SplitMethod, number>>;

export const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'cash', label: 'Efectivo' },
  { id: 'card', label: 'Tarjeta' },
  { id: 'bizum', label: 'Bizum' },
  { id: 'mixed', label: 'Mixto' },
];

export const SPLIT_METHODS: { id: SplitMethod; label: string }[] = [
  { id: 'cash', label: 'Efectivo' },
  { id: 'card', label: 'Tarjeta' },
  { id: 'bizum', label: 'Bizum' },
];

export function owedCents(priceCents: number | null | undefined, paidCents: number): number {
  return Math.max(0, (priceCents ?? 0) - Math.max(0, paidCents));
}

/** "45" / "45,5" / "45.50" → céntimos; vacío o inválido → 0. */
export function eurosInputToCents(raw: string): number {
  const n = Number(raw.trim().replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function centsToEurosInput(cents: number): string {
  if (!cents) return '';
  const euros = cents / 100;
  return Number.isInteger(euros) ? String(euros) : euros.toFixed(2).replace(/\.?0+$/, '');
}

export function sumSplit(split: PaymentSplit | null | undefined): number {
  if (!split) return 0;
  return SPLIT_METHODS.reduce((s, m) => s + Math.max(0, split[m.id] ?? 0), 0);
}

export function normalizeSplit(raw: unknown): PaymentSplit | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const out: PaymentSplit = {};
  let any = false;
  for (const m of SPLIT_METHODS) {
    const n = Number(o[m.id]);
    if (Number.isFinite(n) && n > 0) {
      out[m.id] = Math.round(n);
      any = true;
    }
  }
  return any ? out : null;
}

/** Resume el mixto: "20 € efectivo + 25 € tarjeta". */
export function splitSummary(split: PaymentSplit | null | undefined): string | null {
  if (!split) return null;
  const parts = SPLIT_METHODS
    .filter(m => (split[m.id] ?? 0) > 0)
    .map(m => `${centsToEurosInput(split[m.id]!)} € ${m.label.toLowerCase()}`);
  return parts.length ? parts.join(' + ') : null;
}
