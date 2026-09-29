export type PaymentMethod = 'cash' | 'card' | 'bizum' | 'mixed';

export const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'cash', label: 'Efectivo' },
  { id: 'card', label: 'Tarjeta' },
  { id: 'bizum', label: 'Bizum' },
  { id: 'mixed', label: 'Mixto' },
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
