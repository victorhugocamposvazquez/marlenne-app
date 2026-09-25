import Link from 'next/link';
import type { LiveCenter } from '@/lib/live-center';

export default function LiveEmpresaStrip({ center }: { center: LiveCenter | null }) {
  if (!center) {
    return (
      <div className="rounded-card border border-[#FDE68A] bg-[#FFFBEB] p-4">
        <p className="text-[14px] font-semibold">Arlett Beauty (producción)</p>
        <p className="mt-1 text-[13px] text-ink-2">
          No se ha podido leer la base. Revisa que el panel tenga acceso a Supabase (misma BD que la app).
        </p>
      </div>
    );
  }

  return (
    <Link
      href="/empresas/90001"
      className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-[#BBF7D0] bg-[#F0FDF4] p-4 transition hover:bg-[#ECFDF5]"
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[16px] font-bold">{center.name}</span>
          <span className="inline-flex items-center rounded-pill bg-[#E7F8EE] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#15803D]">
            Live
          </span>
        </div>
        <p className="mt-1 text-[13px] text-ink-2">
          Centro real en la app · SMS {center.opsOn ? 'automáticos encendidos' : 'automáticos apagados en Ops'}
          {' · '}{center.sent} envíos · {center.failed} errores
        </p>
      </div>
      <span className="text-[13px] font-bold text-brand-pink">Abrir ficha →</span>
    </Link>
  );
}
