import { requireSession, listStaff, listServices } from '@/lib/queries';
import { signOut } from '@/app/actions/auth';
import { avatarColor } from '@/lib/categories';
import { LogOut } from 'lucide-react';
import PasswordForm from '@/components/PasswordForm';
import CatalogEditor from '@/components/CatalogEditor';
import TeamEditor from '@/components/TeamEditor';

const ROADMAP = [
  { done: true, label: 'Agenda día y semana, arrastrar citas' },
  { done: true, label: 'Nueva cita, detalle, reprogramar, cancelar' },
  { done: true, label: 'Ficha de clienta y lista de espera' },
  { done: true, label: 'Realtime en la agenda del día' },
  { done: true, label: 'Cierre de sesión clínico al marcar Hecha' },
  { done: true, label: 'Subida de fotos a Storage' },
  { done: true, label: 'Login por email y contraseña' },
  { done: true, label: 'Consentimientos RGPD y bloqueos de agenda' },
  { done: true, label: 'Editar precios y duración del catálogo' },
  { done: true, label: 'Recuperar contraseña por email' },
  { done: true, label: 'Alta y baja de equipo; filtro por profesional' },
  { done: false, label: 'App offline usable (agenda del día en local)' },
];

export default async function AjustesPage() {
  const me = await requireSession();
  const [team, services] = await Promise.all([
    listStaff({ includeInactive: me.role === 'admin' }),
    me.role === 'admin' ? listServices({ includeInactive: true }) : Promise.resolve([]),
  ]);

  return (
    <div className="px-5 pb-6 pt-5">
      <h1 className="text-[23px] font-extrabold tracking-[-.025em]">Más</h1>
      <p className="mt-px text-[13px] font-medium text-ink-2">{me.full_name} · {me.job_title ?? me.role}</p>

      <section className="mt-5">
        {me.role === 'admin' ? (
          <TeamEditor team={team} meId={me.id} />
        ) : (
          <>
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
          </>
        )}
      </section>

      {me.role === 'admin' && (
        <section className="mt-6">
          <h2 className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[.04em] text-ink-3">
            Catálogo · {services.length} servicios
          </h2>
          <p className="mb-2.5 text-[12px] font-medium text-ink-3">Toca un servicio para cambiar precio, duración o ocultarlo.</p>
          <CatalogEditor services={services} />
        </section>
      )}

      <PasswordForm />

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
