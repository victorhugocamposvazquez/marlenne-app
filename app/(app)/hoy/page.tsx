import Link from 'next/link';
import { headers } from 'next/headers';
import { requireSession } from '@/lib/require-session';
import { listProviders, getDayAgenda, countWaitlist, listRecalls } from '@/lib/queries';
import { countMyPasskeys } from '@/app/actions/webauthn';
import { fmt, minutesOfDay, madridNow, DAY_START, DAY_END } from '@/lib/time';
import { Bell, CalendarCheck, ChevronRight, HeartHandshake, UserRound } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import PageHeading from '@/components/ui/PageHeading';
import LiveRefresh from '@/components/LiveRefresh';
import HoyApptRow from '@/components/hoy/HoyApptRow';
import RecallCard from '@/components/hoy/RecallCard';
import PasskeySetupBanner from '@/components/PasskeySetupBanner';
import type { AgendaAppt } from '@/lib/types';

export default async function HoyPage() {
  const me = await requireSession();
  const cabin = me.role === 'provider';
  const [all, waiting, recalls, passkeyCount] = await Promise.all([
    listProviders(),
    cabin ? Promise.resolve(0) : countWaitlist(),
    cabin ? Promise.resolve([]) : listRecalls(6),
    countMyPasskeys(),
  ]);
  const ua = headers().get('user-agent') ?? '';
  const providers = cabin ? all.filter(p => p.id === me.id) : all;
  const { appointments } = await getDayAgenda(new Date(), providers.map(p => p.id));

  const revenue = appointments.reduce((s, a) => s + (a.price_cents ?? 0), 0) / 100;
  const cash = appointments.filter(a => a.status === 'done').reduce((s, a) => s + (a.price_cents ?? 0), 0) / 100;
  const booked = appointments.reduce((s, a) => s + a.duration_min, 0);
  const dayMins = DAY_END - DAY_START;
  const occ = providers.length ? Math.round((100 * booked) / (providers.length * dayMins)) : 0;
  const doneCount = appointments.filter(a => a.status === 'done').length;
  const live = appointments.filter(a => a.status === 'curso');
  const nowMin = madridNow().h * 60 + madridNow().min;
  const pending = appointments.filter(a => a.status === 'prog')
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  const overdue = pending.filter(a => minutesOfDay(a.starts_at) + 10 < nowMin);
  const next = pending.filter(a => minutesOfDay(a.starts_at) + 10 >= nowMin).slice(0, 6);
  const noshow = appointments.filter(a => a.status === 'noshow').length;
  const h = madridNow().h;
  const greeting = h < 13 ? 'Buenos días ☀️' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
  const todayLbl = new Date().toLocaleDateString('es-ES', {
    timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long',
  });
  const nextAppt = next[0];
  const cabinStatus = live[0]
    ? `En cabina · ${live[0].client_label} hasta ${fmt(minutesOfDay(live[0].ends_at))}`
    : overdue[0]
      ? `Retraso · ${overdue[0].client_label} a las ${fmt(minutesOfDay(overdue[0].starts_at))}`
      : nextAppt
        ? `Siguiente a las ${fmt(minutesOfDay(nextAppt.starts_at))} · ${nextAppt.client_label}`
        : 'Libre · no quedan citas';

  return (
    <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-fab pt-5">
      <LiveRefresh tables={cabin ? ['appointments'] : ['appointments', 'waitlist']} />
      <div className="mb-[18px]">
        <PageHeading
          kicker={(
            <div className="text-body font-medium text-ink-2">
              {cabin ? todayLbl : `Hola ${me.full_name}`}
            </div>
          )}
          title={cabin ? 'Tu día' : greeting}
        >
          {!cabin && (
            <Link
              href="/agenda?wait=1"
              className="relative grid h-11 w-11 place-items-center rounded-icon border border-surface-line bg-surface-card text-ink-2 shadow-card transition motion-safe:active:scale-[.96]"
              aria-label="Lista de espera"
            >
              <Bell size={19} strokeWidth={2} />
              {waiting > 0 && <span className="absolute right-2.5 top-2 h-2 w-2 rounded-full border-2 border-surface-card bg-v" />}
            </Link>
          )}
        </PageHeading>
      </div>

      {cabin ? (
        <Link
          href="/agenda?day=0&mode=dia"
          aria-label="Abrir la agenda de hoy"
          className="relative mb-5 block overflow-hidden rounded-card bg-grad px-5 py-[18px] text-white shadow-hero no-underline transition motion-safe:active:scale-[.99]"
        >
          <div className="absolute -right-10 -top-10 h-[150px] w-[150px] rounded-full bg-white/[.13]" />
          <div className="relative pr-8">
            <div className="text-body-lg font-bold leading-snug">{cabinStatus}</div>
            <div className="mt-2 text-caption font-semibold text-white/85">
              {appointments.length === 1 ? '1 cita hoy' : `${appointments.length} citas hoy`}
              {doneCount > 0 ? ` · ${doneCount} hechas` : ''}
              {noshow > 0 ? ` · ${noshow} no vino` : ''}
            </div>
          </div>
          <ChevronRight size={22} strokeWidth={2.2} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/80" aria-hidden />
        </Link>
      ) : (
        <>
          <Link
            href="/agenda?day=0&mode=dia"
            aria-label="Abrir la agenda de hoy"
            className="relative mb-3 block overflow-hidden rounded-card bg-grad px-5 py-[18px] text-white shadow-hero no-underline transition motion-safe:active:scale-[.99]"
          >
            <div className="absolute -right-10 -top-10 h-[150px] w-[150px] rounded-full bg-white/[.13]" />
            <div className="relative pr-8">
              <div className="text-caption font-semibold text-white/85">{todayLbl}</div>
              <div className="mt-1.5 flex items-end gap-2">
                <div className="text-display font-extrabold leading-none tracking-[-.03em]">{appointments.length}</div>
                <div className="pb-[5px] text-body font-semibold">{appointments.length === 1 ? 'cita hoy' : 'citas hoy'}</div>
              </div>
              <div className="mt-3.5 flex flex-wrap gap-2">
                <span className="rounded-pill bg-white/20 px-3 py-1.5 text-caption font-semibold">{revenue} € previstos</span>
                <span className="rounded-pill bg-white/20 px-3 py-1.5 text-caption font-semibold">{occ} % ocupación</span>
                {noshow > 0 && (
                  <span className="rounded-pill bg-white/20 px-3 py-1.5 text-caption font-semibold">{noshow} no vino</span>
                )}
              </div>
            </div>
            <ChevronRight size={22} strokeWidth={2.2} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/80" aria-hidden />
          </Link>

          <div className="mb-5 flex gap-2.5">
            <div className="flex-1 rounded-row border border-surface-line bg-surface-card p-3.5 shadow-card">
              <div className="text-label font-bold text-ink-2">CAJA HASTA AHORA</div>
              <div className="mt-1 text-h1 font-extrabold tracking-[-.02em]">{cash} €</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded bg-surface-line">
                <div className="h-1.5 rounded bg-grad" style={{ width: `${revenue ? Math.round((100 * cash) / revenue) : 0}%` }} />
              </div>
            </div>
            <div className="flex-1 rounded-row border border-surface-line bg-surface-card p-3.5 shadow-card">
              <div className="text-label font-bold text-ink-2">HECHAS</div>
              <div className="mt-1 text-h1 font-extrabold tracking-[-.02em] tabular-nums">
                {doneCount}<span className="text-body font-bold text-ink-3"> / {appointments.length}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded bg-surface-line">
                <div
                  className="h-1.5 rounded bg-grad"
                  style={{ width: `${appointments.length ? Math.round((100 * doneCount) / appointments.length) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      <PasskeySetupBanner ua={ua} hasPasskeys={passkeyCount > 0} />

      {live.length > 0 && (
        <>
          <div className="mb-2.5 flex items-center gap-[7px]">
            <span className="h-2 w-2 animate-pulseDot rounded-full bg-ok" />
            <h2 className="text-body-lg font-extrabold tracking-[-.02em]">En cabina ahora</h2>
          </div>
          <div className="mb-[22px] flex flex-col gap-2.5">
            {live.map(a => <LiveRow key={a.id} appt={a} cabin={cabin} />)}
          </div>
        </>
      )}

      {overdue.length > 0 && (
        <>
          <h2 className="mb-2.5 text-body-lg font-extrabold tracking-[-.02em]">Sin llegar</h2>
          <div className="mb-[22px] flex flex-col gap-2.5">
            {overdue.map(a => <HoyApptRow key={a.id} appt={a} late cabin={cabin} />)}
          </div>
        </>
      )}

      <h2 className="mb-2.5 text-body-lg font-extrabold tracking-[-.02em]">Siguientes</h2>
      <div className="flex flex-col gap-2.5 pb-2.5">
        {next.length === 0 && overdue.length === 0 && (
          <EmptyState icon={CalendarCheck} title="No quedan citas pendientes hoy." />
        )}
        {next.length === 0 && overdue.length > 0 && (
          <EmptyState title="Las que faltan están arriba, con retraso." />
        )}
        {next.map(a => <HoyApptRow key={a.id} appt={a} cabin={cabin} />)}
      </div>

      {!cabin && (
        <>
          <h2 className="mb-1 mt-5 text-body-lg font-extrabold tracking-[-.02em]">Por volver</h2>
          <p className="mb-2.5 text-label font-medium text-ink-2">
            Última visita hace 3–17 semanas y sin cita. WhatsApp o dar hueco.
          </p>
          <div className="flex flex-col gap-2.5 pb-2.5">
            {recalls.length === 0 && (
              <EmptyState icon={HeartHandshake} title="Nadie pendiente de volver." hint="Cuando alguna clienta lleve tiempo sin venir, saldrá aquí." />
            )}
            {recalls.map(r => <RecallCard key={r.client_id} row={r} />)}
          </div>
        </>
      )}
    </div>
  );
}

function LiveRow({ appt, cabin }: { appt: AgendaAppt; cabin: boolean }) {
  return (
    <div className="flex items-center gap-[11px] rounded-row border border-ok-line bg-ok-bg p-3">
      <div className="min-w-0 flex-1">
        <div className="text-body font-bold tracking-[-.01em]">{appt.client_label}</div>
        <div className="text-caption font-semibold text-ok-fg">
          {appt.service_name} · termina {fmt(minutesOfDay(appt.ends_at))}
        </div>
      </div>
      {cabin && appt.client_id && (
        <Link
          href={`/clientas/${appt.client_id}`}
          aria-label={`Ficha de ${appt.client_label}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-icon border border-ok-line bg-surface-card text-v-d transition motion-safe:active:scale-[.96]"
        >
          <UserRound size={16} strokeWidth={2.2} />
        </Link>
      )}
      <Link
        href={appt.client_id ? `/agenda?appt=${appt.id}&close=1` : `/agenda?appt=${appt.id}`}
        className="grid min-h-[44px] shrink-0 place-items-center rounded-icon bg-ok px-3.5 text-label font-bold text-white transition motion-safe:active:scale-[.97]"
      >
        Terminar
      </Link>
    </div>
  );
}
