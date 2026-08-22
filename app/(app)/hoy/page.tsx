import Link from 'next/link';
import { requireSession, listProviders, getDayAgenda, countWaitlist } from '@/lib/queries';
import { fmt, durLbl, minutesOfDay, madridNow } from '@/lib/time';
import { CATEGORIES } from '@/lib/categories';
import { Bell } from 'lucide-react';
import LiveRefresh from '@/components/LiveRefresh';
import { setStatus } from '@/app/actions/appointments';

export default async function HoyPage() {
  const me = await requireSession();
  const all = await listProviders();
  const providers = me.role === 'provider' ? all.filter(p => p.id === me.id) : all;
  const { appointments } = await getDayAgenda(new Date(), providers.map(p => p.id));
  const waiting = await countWaitlist();

  const revenue = appointments.reduce((s, a) => s + (a.price_cents ?? 0), 0) / 100;
  const cash = appointments.filter(a => a.status === 'done').reduce((s, a) => s + (a.price_cents ?? 0), 0) / 100;
  const booked = appointments.reduce((s, a) => s + a.duration_min, 0);
  const occ = providers.length ? Math.round((100 * booked) / (providers.length * 660)) : 0;
  const live = appointments.filter(a => a.status === 'curso');
  const next = appointments.filter(a => a.status === 'prog').sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)).slice(0, 6);
  const h = madridNow().h;
  const greeting = h < 13 ? 'Buenos días ☀️' : h < 20 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="px-5 pb-2 pt-5">
      <LiveRefresh tables={['appointments', 'waitlist']} />
      <div className="mb-[18px] flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[13px] font-medium text-ink-2">Hola {me.full_name}</div>
          <div className="text-2xl font-extrabold leading-[1.15] tracking-[-.025em]">{greeting}</div>
        </div>
        <Link
          href="/agenda?wait=1"
          className="relative grid h-[42px] w-[42px] place-items-center rounded-[14px] border border-surface-line bg-white shadow-card"
          aria-label="Lista de espera"
        >
          <Bell size={19} strokeWidth={2} />
          {waiting > 0 && <span className="absolute right-2.5 top-2 h-2 w-2 rounded-full border-2 border-white bg-v" />}
        </Link>
      </div>

      <div className="relative mb-3 overflow-hidden rounded-[22px] bg-grad px-5 py-[18px] text-white shadow-hero">
        <div className="absolute -right-10 -top-10 h-[150px] w-[150px] rounded-full bg-white/[.13]" />
        <div className="relative">
          <div className="text-xs font-semibold opacity-85">
            {new Date().toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div className="mt-1.5 flex items-end gap-2">
            <div className="text-[40px] font-extrabold leading-none tracking-[-.03em]">{appointments.length}</div>
            <div className="pb-[5px] text-sm font-semibold">{appointments.length === 1 ? 'cita hoy' : 'citas hoy'}</div>
          </div>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <span className="rounded-xl bg-white/20 px-3 py-1.5 text-xs font-semibold">{revenue} € previstos</span>
            <span className="rounded-xl bg-white/20 px-3 py-1.5 text-xs font-semibold">{occ} % ocupación</span>
          </div>
        </div>
      </div>

      <div className="mb-5 flex gap-2.5">
        <div className="flex-1 rounded-row border border-surface-line bg-white p-3.5 shadow-card">
          <div className="text-[11px] font-bold text-ink-3">CAJA HASTA AHORA</div>
          <div className="mt-1 text-[22px] font-extrabold tracking-[-.02em]">{cash} €</div>
          <div className="mt-2 h-1.5 overflow-hidden rounded bg-surface-line">
            <div className="h-1.5 rounded bg-grad" style={{ width: `${revenue ? Math.round((100 * cash) / revenue) : 0}%` }} />
          </div>
        </div>
      </div>

      {live.length > 0 && (
        <>
          <div className="mb-2.5 flex items-center gap-[7px]">
            <span className="h-2 w-2 animate-pulseDot rounded-full bg-emerald-500" />
            <h2 className="text-base font-extrabold tracking-[-.02em]">En cabina ahora</h2>
          </div>
          <div className="mb-[22px] flex flex-col gap-2.5">
            {live.map(a => (
              <div key={a.id} className="flex items-center gap-[11px] rounded-row border border-emerald-200 bg-emerald-50 p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold tracking-[-.01em]">{a.client_label}</div>
                  <div className="text-[11.5px] font-semibold text-emerald-700">
                    {a.service_name} · termina {fmt(minutesOfDay(a.ends_at))}
                  </div>
                </div>
                <Link
                  href={a.client_id ? `/agenda?appt=${a.id}&close=1` : `/agenda?appt=${a.id}`}
                  className="shrink-0 rounded-[13px] bg-emerald-500 px-3.5 py-2.5 text-[12.5px] font-bold text-white"
                >
                  Terminar
                </Link>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="mb-2.5 text-base font-extrabold tracking-[-.02em]">Siguientes</h2>
      <div className="flex flex-col gap-2.5 pb-2.5">
        {next.length === 0 && (
          <p className="rounded-row border border-dashed border-handle bg-white/60 px-4 py-6 text-center text-[13px] font-semibold text-ink-3">
            No quedan citas pendientes hoy.
          </p>
        )}
        {next.map(a => {
          const cat = CATEGORIES[a.category];
          return (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-row border border-surface-line bg-white p-3 shadow-card"
            >
              <Link href={`/agenda?appt=${a.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <div className="w-[52px] shrink-0 rounded-[13px] bg-v-tint py-[7px] text-center">
                  <div className="text-[13.5px] font-extrabold leading-none text-v-d tabular-nums">{fmt(minutesOfDay(a.starts_at))}</div>
                  <div className="mt-0.5 text-[9.5px] font-semibold text-ink-3">{durLbl(a.duration_min)}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold tracking-[-.01em]">{a.client_label}</div>
                  <div className="truncate text-[11.5px] font-medium text-ink-3">{a.service_name} · {a.provider_name}</div>
                </div>
                <span className="shrink-0 rounded-[9px] px-2 py-1 text-[10px] font-bold" style={{ background: cat.bg, color: cat.fg }}>
                  {cat.label}
                </span>
              </Link>
              <form action={setStatus}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="status" value="curso" />
                <button className="shrink-0 rounded-[13px] bg-v px-3 py-2.5 text-[12px] font-bold text-white">
                  Pasa
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
