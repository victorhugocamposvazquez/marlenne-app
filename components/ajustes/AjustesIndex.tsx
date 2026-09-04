import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import ReadyList from '@/components/ajustes/ReadyList';
import type { ReadyItem } from '@/lib/ready';
import type { StaffRole } from '@/lib/types';

type Destino = { href: string; title: string; hint: string };

function Group({ title, rows }: { title: string; rows: Destino[] }) {
  if (!rows.length) return null;
  return (
    <section className="mt-5">
      <h2 className="mb-2.5 text-body font-extrabold uppercase tracking-[.04em] text-ink-2">{title}</h2>
      <div className="overflow-hidden rounded-row border border-surface-line bg-surface-card shadow-card">
        {rows.map(row => (
          <Link
            key={row.href}
            href={row.href}
            className="flex min-h-[44px] items-center gap-3 border-b border-surface-line px-3.5 py-3 last:border-0 motion-safe:active:bg-v-tint"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-body font-bold">{row.title}</span>
              <span className="block text-caption font-medium leading-snug text-ink-2">{row.hint}</span>
            </span>
            <ChevronRight size={18} strokeWidth={2.2} className="shrink-0 text-ink-3" aria-hidden />
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function AjustesIndex({
  me, ready,
}: {
  me: { full_name: string; job_title: string | null; role: StaffRole };
  ready: ReadyItem[];
}) {
  const admin = me.role === 'admin';
  const desk = admin || me.role === 'reception';

  const centro: Destino[] = [
    { href: '/ajustes/equipo', title: 'Equipo', hint: admin ? 'Altas, rol y baja' : 'Quién trabaja en el centro' },
    ...(admin ? [{
      href: '/ajustes/servicios',
      title: 'Servicios',
      hint: 'Categorías, precios y duración',
    }] : []),
    ...(desk ? [{
      href: '/ajustes/bonos',
      title: 'Bonos',
      hint: admin ? 'Plantillas, vendidos y recargar sesiones' : 'Vendidos y recargar sesiones',
    }] : []),
    ...(admin ? [{
      href: '/ajustes/importar',
      title: 'Importar CSV',
      hint: 'Una mudanza: servicios, clientas y citas',
    }, {
      href: '/ajustes/voz',
      title: 'Voz',
      hint: 'Lo que no entendió, últimos 30 días',
    }] : []),
  ];

  const cuenta: Destino[] = [
    { href: '/ajustes/cuenta', title: 'Tu cuenta', hint: 'Voz, atajos, contraseña y salir' },
  ];

  return (
    <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-fab pt-5">
      <h1 className="text-h1 font-extrabold tracking-[-.025em]">Ajustes</h1>
      <p className="mt-px text-body font-medium text-ink-2">{me.full_name} · {me.job_title ?? me.role}</p>
      <Group title="Centro" rows={centro} />
      <Group title="Cuenta" rows={cuenta} />
      {admin && <ReadyList items={ready} />}
    </div>
  );
}