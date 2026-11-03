'use client';

import { useEffect, useState, useTransition, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  MapPin,
  User,
} from 'lucide-react';
import {
  formatBookingWhen,
  formatPriceCents,
  monthCells,
  monthTitle,
  shiftMonth,
  weekdayLabels,
  ymd,
} from '@/lib/booking/calendar';
import { apiDaySlots, apiMonthDays, apiSubmitBooking } from '@/lib/booking/client';
import { resolveBookingTheme } from '@/lib/booking/theme';
import { durLbl, madridNow } from '@/lib/time';
import BrandLogo from '@/components/BrandLogo';
import type {
  BookingConfirm,
  BookingProvider,
  BookingSalon,
  BookingService,
  BookingSlot,
} from '@/lib/booking/types';

type Step = 'services' | 'when' | 'details' | 'done';

export default function BookingWizard({
  slug,
  salon,
  services,
  providers = [],
  presetServiceId = null,
  presetProviderId = null,
  customTitle = null,
  embed = false,
}: {
  slug: string;
  salon: BookingSalon;
  services: BookingService[];
  providers?: BookingProvider[];
  presetServiceId?: string | null;
  presetProviderId?: string | null;
  /** Título del embudo/ads; sustituye el genérico o el nombre del servicio. */
  customTitle?: string | null;
  embed?: boolean;
}) {
  const lockedService = services.find(s => s.id === presetServiceId) ?? null;
  const lockedProvider =
    (presetProviderId && providers.find(p => p.id === presetProviderId)) || null;
  const providerFilterId = lockedProvider?.id ?? null;

  const now = madridNow();
  const [step, setStep] = useState<Step>(lockedService ? 'when' : 'services');
  const [service, setService] = useState<BookingService | null>(lockedService);
  const [year, setYear] = useState(now.y);
  const [month, setMonth] = useState(now.m);
  const [availableDays, setAvailableDays] = useState<Set<string>>(new Set());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [slot, setSlot] = useState<BookingSlot | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<BookingConfirm | null>(null);
  const [pending, startTransition] = useTransition();
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (!service || step !== 'when') return;
    let cancelled = false;
    setLoadingMonth(true);
    setAvailableDays(new Set());
    apiMonthDays(slug, service.id, year, month, providerFilterId)
      .then(r => {
        if (cancelled) return;
        setAvailableDays(new Set(r.ok ? r.days : []));
      })
      .catch(() => {
        if (!cancelled) setAvailableDays(new Set());
      })
      .finally(() => {
        if (!cancelled) setLoadingMonth(false);
      });
    return () => { cancelled = true; };
  }, [slug, service, year, month, step, providerFilterId]);

  useEffect(() => {
    if (!service || !selectedDay || step !== 'when') return;
    let cancelled = false;
    setLoadingSlots(true);
    setSlot(null);
    setSlots([]);
    apiDaySlots(slug, service.id, selectedDay, providerFilterId)
      .then(r => {
        if (cancelled) return;
        setSlots(r.ok ? r.slots : []);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => { cancelled = true; };
  }, [slug, service, selectedDay, step, providerFilterId]);

  function pickService(s: BookingService) {
    setService(s);
    setSelectedDay(null);
    setSlots([]);
    setSlot(null);
    setError(null);
    setStep('when');
  }

  function pickDay(day: number) {
    const key = ymd(year, month, day);
    if (!availableDays.has(key)) return;
    setSelectedDay(key);
    setSlot(null);
  }

  function clearDay() {
    setSelectedDay(null);
    setSlot(null);
    setSlots([]);
  }

  function goDetails() {
    if (!slot) return;
    setError(null);
    setStep('details');
  }

  function back() {
    setError(null);
    if (step === 'when') {
      if (selectedDay) {
        clearDay();
        return;
      }
      if (lockedService) return;
      setService(null);
      setSlot(null);
      setStep('services');
    } else if (step === 'details') {
      setStep('when');
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!service || !slot) return;
    setError(null);
    startTransition(async () => {
      try {
        const r = await apiSubmitBooking({
          slug,
          serviceId: service.id,
          startsAt: slot.starts_at,
          providerId: providerFilterId ?? slot.provider_id,
          fullName,
          phone,
          email: email.trim() || undefined,
          note: note.trim() || undefined,
        });
        if (!r.ok) {
          setError(r.message ?? 'No se ha podido completar la reserva.');
          return;
        }
        setConfirm(r);
        setStep('done');
      } catch {
        setError('No se ha podido completar la reserva. Prueba de nuevo.');
      }
    });
  }

  const when = slot ? formatBookingWhen(slot.starts_at, salon.timezone) : null;
  const dayLabel = selectedDay
    ? new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : null;
  const showBack =
    step === 'details' ||
    (step === 'when' && (!!selectedDay || !lockedService));

  const theme = resolveBookingTheme({
    accent: salon.accent,
    accentSoft: salon.accent_soft,
    ink: salon.ink,
  });
  const logoUrl = salon.logo_url ?? null;

  return (
    <div
      className={`booking-root ${embed ? 'min-h-full' : 'min-h-[100dvh]'} bg-[var(--bk-bg)]`}
      style={{
        ['--bk' as string]: theme.accent,
        ['--bk-soft' as string]: theme.accentSoft,
        ['--bk-hover' as string]: theme.accentHover,
        ['--bk-ink' as string]: theme.ink,
        ['--bk-on' as string]: theme.onAccent,
      }}
    >
      <div
        className={[
          'mx-auto w-full px-0 sm:px-4',
          embed ? 'max-w-[1040px] py-0 sm:py-4' : 'max-w-[1040px] py-0 sm:py-10 md:py-14',
        ].join(' ')}
      >
        <div
          className={[
            'overflow-hidden bg-[var(--bk-card)]',
            embed
              ? 'sm:rounded-lg sm:border sm:border-[var(--bk-line)] sm:shadow-[0_1px_6px_rgba(0,0,0,.08)]'
              : 'min-h-[100dvh] sm:min-h-0 sm:rounded-lg sm:border sm:border-[var(--bk-line)] sm:shadow-[0_1px_6px_rgba(0,0,0,.08)]',
          ].join(' ')}
        >
          <div className="flex min-h-[inherit] flex-col md:min-h-[620px] md:flex-row">
            {/* Panel evento — estilo Calendly */}
            <aside className="relative border-b border-[var(--bk-line)] md:w-[340px] md:shrink-0 md:border-b-0 md:border-r">
              <div className="absolute left-0 top-0 hidden h-full w-1 bg-[var(--bk)] md:block" aria-hidden />
              <div className="px-5 py-5 sm:px-7 sm:py-7 md:pl-8">
                {showBack && (
                  <button
                    type="button"
                    onClick={back}
                    className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--bk)] transition hover:bg-[var(--bk-soft)] md:mb-5"
                    aria-label="Atrás"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}

                {logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt=""
                    className="mb-4 h-10 w-auto max-w-[160px] object-contain object-left"
                  />
                )}

                <p className="text-[14px] font-semibold text-[var(--bk-muted)]">{salon.name}</p>
                <h1 className="mt-1 text-[22px] font-bold leading-tight tracking-[-0.02em] text-[var(--bk-ink)] sm:text-[26px]">
                  {customTitle || (service ? service.name : 'Reservar cita')}
                </h1>
                {customTitle && service && customTitle !== service.name && (
                  <p className="mt-1.5 text-[14px] font-medium text-[var(--bk-muted)]">{service.name}</p>
                )}

                {service ? (
                  <ul className="mt-4 space-y-2.5 text-[14px] text-[var(--bk-muted)] sm:mt-5">
                    <MetaRow icon={<Clock className="h-4 w-4" />}>
                      {durLbl(service.duration_min)}
                    </MetaRow>
                    <MetaRow icon={<span className="block h-1.5 w-1.5 rounded-full bg-[var(--bk-muted)]" />}>
                      {formatPriceCents(service.price_cents)}
                    </MetaRow>
                    {lockedProvider && (
                      <MetaRow icon={<User className="h-4 w-4" />}>{lockedProvider.name}</MetaRow>
                    )}
                    {when && (
                      <MetaRow icon={<Calendar className="h-4 w-4" />}>
                        <span className="capitalize">{when.date}</span>
                        <br />
                        <span className="font-semibold text-[var(--bk-ink)]">{when.time}</span>
                      </MetaRow>
                    )}
                    {salon.phone && (
                      <MetaRow icon={<MapPin className="h-4 w-4" />}>{salon.phone}</MetaRow>
                    )}
                  </ul>
                ) : (
                  <p className="mt-3 text-[14px] leading-relaxed text-[var(--bk-muted)]">
                    {salon.intro ?? 'Elige un servicio para ver la disponibilidad.'}
                  </p>
                )}
              </div>
            </aside>

            {/* Panel derecho */}
            <section className="relative flex min-w-0 flex-1 flex-col px-5 py-5 sm:px-8 sm:py-7">
              {step === 'services' && (
                <div className="mx-auto w-full max-w-[520px]">
                  <h2 className="text-[18px] font-bold text-[var(--bk-ink)] sm:text-[20px]">
                    Selecciona un servicio
                  </h2>
                  <ul className="mt-4 divide-y divide-[var(--bk-line)] overflow-hidden rounded-md border border-[var(--bk-line)]">
                    {services.map(s => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => pickService(s)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-[var(--bk-soft)]"
                        >
                          <span>
                            <span className="block text-[15px] font-semibold text-[var(--bk-ink)]">
                              {s.name}
                            </span>
                            <span className="mt-0.5 block text-[13px] text-[var(--bk-muted)]">
                              {durLbl(s.duration_min)} · {formatPriceCents(s.price_cents)}
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--bk-muted)]" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  {!services.length && (
                    <p className="mt-6 text-[14px] text-[var(--bk-muted)]">
                      No hay servicios reservables ahora mismo.
                    </p>
                  )}
                </div>
              )}

              {step === 'when' && service && (
                <div className="flex min-h-0 flex-1 flex-col">
                  <h2 className={`text-[18px] font-bold text-[var(--bk-ink)] sm:text-[20px] ${selectedDay ? 'max-md:hidden' : ''}`}>
                    Selecciona fecha y hora
                  </h2>

                  <div
                    className={[
                      'flex min-h-0 flex-1 flex-col gap-6',
                      selectedDay ? 'mt-0 md:mt-4 md:flex-row md:gap-8' : 'mt-4',
                    ].join(' ')}
                  >
                    {/* Calendario: en móvil se oculta al elegir día (flujo Calendly) */}
                    <div className={selectedDay ? 'hidden md:block md:min-w-0 md:flex-1' : 'w-full md:max-w-[360px]'}>
                      <div className="flex items-center justify-between">
                        <p className="text-[16px] font-bold text-[var(--bk-ink)]">
                          {monthTitle(year, month)}
                        </p>
                        <div className="flex gap-1">
                          <IconNav
                            label="Mes anterior"
                            onClick={() => {
                              const n = shiftMonth(year, month, -1);
                              setYear(n.year);
                              setMonth(n.month);
                              clearDay();
                            }}
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </IconNav>
                          <IconNav
                            label="Mes siguiente"
                            onClick={() => {
                              const n = shiftMonth(year, month, 1);
                              setYear(n.year);
                              setMonth(n.month);
                              clearDay();
                            }}
                          >
                            <ChevronRight className="h-5 w-5" />
                          </IconNav>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
                        {weekdayLabels().map(d => (
                          <div
                            key={d}
                            className="py-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--bk-muted)]"
                          >
                            {d.slice(0, 3)}
                          </div>
                        ))}
                        {monthCells(year, month).map((day, i) => {
                          if (day == null) return <div key={`e-${i}`} />;
                          const key = ymd(year, month, day);
                          const open = !loadingMonth && availableDays.has(key);
                          const selected = selectedDay === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              disabled={!open}
                              onClick={() => pickDay(day)}
                              className={[
                                'mx-auto flex h-10 w-10 items-center justify-center rounded-full text-[14px] font-semibold transition sm:h-11 sm:w-11',
                                selected
                                  ? 'bg-[var(--bk)] text-[var(--bk-on)]'
                                  : open
                                    ? 'bg-[var(--bk-soft)] text-[var(--bk)] hover:bg-[var(--bk)] hover:text-[var(--bk-on)]'
                                    : 'cursor-default text-[#c5c8ce]',
                              ].join(' ')}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>

                      {loadingMonth && (
                        <p className="mt-3 text-[13px] text-[var(--bk-muted)]">
                          Comprobando disponibilidad…
                        </p>
                      )}

                      <p className="mt-5 flex items-center gap-2 text-[13px] text-[var(--bk-muted)]">
                        <Globe className="h-3.5 w-3.5" aria-hidden />
                        {salon.timezone.replace('_', ' ')}
                      </p>
                    </div>

                    {/* Horas */}
                    {selectedDay && (
                      <div className="flex min-h-0 w-full flex-1 flex-col md:max-w-[220px] md:shrink-0">
                        <div className="mb-3 flex items-center justify-between gap-2 md:block">
                          <p className="text-[15px] font-semibold capitalize text-[var(--bk-ink)]">
                            {dayLabel}
                          </p>
                          <button
                            type="button"
                            onClick={clearDay}
                            className="text-[13px] font-semibold text-[var(--bk)] md:hidden"
                          >
                            Cambiar
                          </button>
                        </div>

                        <div className="max-h-[min(420px,55dvh)] space-y-2 overflow-y-auto overscroll-contain pr-1 md:max-h-[440px]">
                          {loadingSlots && (
                            <p className="text-[13px] text-[var(--bk-muted)]">Cargando horas…</p>
                          )}
                          {!loadingSlots && !slots.length && (
                            <p className="text-[13px] text-[var(--bk-muted)]">Sin huecos este día.</p>
                          )}
                          {slots.map(s => {
                            const active = slot?.starts_at === s.starts_at;
                            return (
                              <div key={s.starts_at} className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSlot(s)}
                                  className={[
                                    'h-12 flex-1 rounded-md border text-[14px] font-bold transition',
                                    active
                                      ? 'border-transparent bg-[#0b3558] text-white'
                                      : 'border-[var(--bk)] text-[var(--bk)] hover:bg-[var(--bk-soft)]',
                                  ].join(' ')}
                                >
                                  {s.label}
                                </button>
                                {active && (
                                  <button
                                    type="button"
                                    onClick={goDetails}
                                    className="h-12 min-w-[88px] rounded-md bg-[var(--bk)] px-3 text-[14px] font-bold text-[var(--bk-on)] transition hover:bg-[var(--bk-hover)]"
                                  >
                                    Siguiente
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 'details' && service && slot && when && (
                <form onSubmit={onSubmit} className="mx-auto w-full max-w-[440px]">
                  <h2 className="text-[18px] font-bold text-[var(--bk-ink)] sm:text-[20px]">
                    Introduce tus datos
                  </h2>
                  <p className="mt-1 text-[14px] capitalize text-[var(--bk-muted)]">
                    {when.date} · {when.time}
                  </p>

                  <Field label="Nombre *">
                    <input
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      autoComplete="name"
                      className={fieldClass}
                      placeholder="María López"
                    />
                  </Field>
                  <Field label="Móvil *">
                    <input
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      autoComplete="tel"
                      inputMode="tel"
                      className={fieldClass}
                      placeholder="612 345 678"
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="email"
                      className={fieldClass}
                      placeholder="maria@email.com"
                    />
                  </Field>
                  <Field label="Notas">
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      rows={3}
                      className={`${fieldClass} resize-none`}
                      placeholder="Comparte cualquier cosa que nos ayude a prepararnos"
                    />
                  </Field>

                  {error && (
                    <p className="mt-3 rounded-md border border-[#fecdd3] bg-[#fff1f2] px-3 py-2 text-[13px] font-semibold text-[#b3123b]">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={pending}
                    className="mt-6 h-12 w-full rounded-full bg-[var(--bk)] text-[15px] font-bold text-[var(--bk-on)] transition hover:bg-[var(--bk-hover)] disabled:opacity-60 sm:w-auto sm:px-8"
                  >
                    {pending ? 'Reservando…' : 'Confirmar'}
                  </button>
                </form>
              )}

              {step === 'done' && confirm && (
                <div className="mx-auto flex w-full max-w-[440px] flex-col items-start py-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ecfdf5] text-[#047857]">
                    <Check className="h-7 w-7" strokeWidth={2.5} />
                  </div>
                  <h2 className="mt-4 text-[22px] font-bold text-[var(--bk-ink)]">
                    Estás agendada
                  </h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-[var(--bk-muted)]">
                    Se ha confirmado tu cita de{' '}
                    <span className="font-semibold text-[var(--bk-ink)]">{confirm.service_name}</span>
                    {' '}con {confirm.salon_name}.
                  </p>
                  {(() => {
                    const w = formatBookingWhen(confirm.starts_at, salon.timezone);
                    return (
                      <div className="mt-5 w-full rounded-md border border-[var(--bk-line)] bg-[#fafbfc] px-4 py-3.5 text-[14px]">
                        <p className="font-semibold capitalize text-[var(--bk-ink)]">{w.date}</p>
                        <p className="mt-0.5 text-[var(--bk-muted)]">
                          {w.time} · {durLbl(confirm.duration_min)}
                        </p>
                      </div>
                    );
                  })()}
                  <p className="mt-4 text-[13px] text-[var(--bk-muted)]">
                    Si necesitas cambiarla, llama al centro
                    {salon.phone ? ` (${salon.phone})` : ''}.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>

        {!embed && (
          <div className="mt-4 flex justify-center px-4 pb-6 sm:mt-6 sm:pb-0">
            <BrandLogo size={36} />
          </div>
        )}
      </div>
    </div>
  );
}

const fieldClass =
  'mt-1.5 w-full rounded-md border border-[var(--bk-line)] bg-white px-3.5 py-3 text-[16px] text-[var(--bk-ink)] outline-none transition focus:border-[var(--bk)] focus:ring-1 focus:ring-[var(--bk)]';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mt-4 block">
      <span className="text-[13px] font-semibold text-[var(--bk-ink)]">{label}</span>
      {children}
    </label>
  );
}

function MetaRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center text-[var(--bk-muted)]">
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}

function IconNav({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--bk)] transition hover:bg-[var(--bk-soft)]"
    >
      {children}
    </button>
  );
}
