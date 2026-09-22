export function fmt(n: number) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function eur(n: number) {
  return `${fmt(n)} €`;
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(w => /[A-Za-zÁÉÍÓÚÑ]/.test(w[0] ?? ''))
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export const STATUS_COLOR: Record<string, string> = {
  Activa: '#22C55E',
  Impago: '#E11D48',
  Prueba: '#0879ff',
  Pausada: '#9A97A8',
};
