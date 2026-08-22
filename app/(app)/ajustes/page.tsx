import { requireSession, listStaff, listServices } from '@/lib/queries';
import { signOut } from '@/app/actions/auth';
import { CATEGORIES, avatarColor } from '@/lib/categories';
import { durLbl } from '@/lib/time';
import { LogOut } from 'lucide-react';

const ROADMAP = [
  { done: true, label: 'Agenda día y semana, arrastrar citas' },
  { done: true, label: 'Nueva cita, detalle, reprogramar, cancelar' },
  { done: true, label: 'Ficha de clienta y lista de espera' },
  { done: true, label: 'Realtime en la agenda del día' },
  { done: true, label: 'Cierre de sesión clínico al marcar Hecha' },
  { done: true, label: 'Subida de fotos a Storage' },
  { done: false, label: 'Login real por usuario (ahora es un selector de perfil)' },
  { done: false, label: 'Service worker con caché offline' },
];

export default async function AjustesPage() {
  const me = await requireSession();
  const [team, services] = await Promise.all([listStaff(), listServices()]);

  return (
    <div className="px-5 pb-6 pt-5">
      <h1 className="text-[23px] font-extrabold tracking-[-.025em]">Más</h1>
      <p className="mt-px text-[13px] font-medium text-ink-2">{me.full_name} · {me.job_title ?? me.role}</p>

      <section className="mt-5">
        <h2 className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[.04em] text-ink-3">Equipo</h2>
        <div className="flex flex-col gap-2">
          {team.map(p => (
            <div key={p.id} className="flex items-center gap-3 rounded-row border border-surface-line bg-white p-3 shadow-card">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] text-[11px] font-bold text-white"
                style={{ background: p.color ?? avatarColor(p.full_name) }}
              >
                {p.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-bold">{p.full_name}</span>
                <span className="block truncate text-[11.5px] font-medium text-ink-3">{p.job_title}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {me.role === 'admin' && (
        <section className="mt-6">
          <h2 className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[.04em] text-ink-3">
            Catálogo · {services.length} servicios
          </h2>
          <div className="flex flex-col gap-3">
            {Object.entries(CATEGORIES).map(([id, cat]) => {
              const list = services.filter(s => s.category === id);
              if (!list.length) return null;
              return (
                <div key={id}>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold" style={{ color: cat.fg }}>
                    <span className="h-2 w-2 rounded-sm" style={{ background: cat.color }} />
                    {cat.label}
                  </div>
                  <div className="overflow-hidden rounded-row border border-surface-line bg-white">
                    {list.map(s => (
                      <div key={s.id} className="flex items-baseline justify-between gap-3 border-b border-surface-line px-3.5 py-2.5 last:border-0">
                        <span className="min-w-0 truncate text-[13px] font-semibold">{s.name}</span>
                        <span className="shrink-0 text-[11.5px] font-bold tabular-nums text-ink-3">
                          {durLbl(s.duration_min)} · {(s.price_cents / 100).toFixed(0)} €
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[.04em] text-ink-3">En el radar</h2>
        <ul className="rounded-row border border-surface-line bg-white px-3.5 py-2 shadow-card">
          {ROADMAP.map(item => (
            <li key={item.label} className="flex items-start gap-2.5 border-b border-surface-line py-2.5 last:border-0">
              <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${item.done ? 'bg-emerald-500' : 'bg-handle'}`} />
              <span className={`text-[13px] font-semibold ${item.done ? 'text-ink-2' : 'text-ink'}`}>{item.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <form action={signOut} className="mt-8">
        <button className="flex w-full items-center justify-center gap-2 rounded-field border border-surface-line bg-white py-3.5 text-[14px] font-bold text-pink-700 shadow-card">
          <LogOut size={17} strokeWidth={2.2} />
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
