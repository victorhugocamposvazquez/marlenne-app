/** Mapea catálogo real del centro → tipos del editor de web. */

import type { Provider, ServiceOption } from '@/lib/types';
import type { Service } from '@/lib/web/types';

function eur(cents: number): string {
  const n = cents / 100;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function servicesToWebCatalog(services: ServiceOption[]): Service[] {
  return services.map((s, i) => ({
    id: s.id,
    name: s.name,
    meta: `${s.duration_min} min${s.category_label ? ` · ${s.category_label}` : ''}`,
    price: eur(s.price_cents),
    pub: true,
    nov: i < 2,
    book: true,
  }));
}

export function staffToWebTeam(staff: Provider[]): [string, string][] {
  return staff.map(s => [s.full_name, s.job_title || 'Profesional']);
}

/** Tema de banco de fotos a partir del nombre del servicio. */
export function themeForService(name: string): string {
  const n = name.toLowerCase();
  if (/uña|manic|pedic|nail/.test(n)) return 'unas';
  if (/ceja|pestañ|lifting|laminado/.test(n)) return 'pestanas';
  if (/láser|laser|depil/.test(n)) return 'depilacion';
  if (/presoterap|corporal|cavit|radiof|reduct/.test(n)) return 'corporal';
  if (/masaje|spa|relax/.test(n)) return 'spa';
  if (/facial|limpieza|peeling|hialuron|botox|skin/.test(n)) return 'facial';
  return 'centro';
}
