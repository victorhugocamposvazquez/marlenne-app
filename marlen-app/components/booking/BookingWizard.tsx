'use client';

import { useEffect, useState, useTransition, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
} from 'lucide-react';
import {
  fetchBookingDaySlots,
  fetchBookingMonthDays,
  submitBooking,
} from '@/app/actions/booking';
import {
  formatBookingWhen,
  formatPriceCents,
  monthCells,
  monthTitle,
  shiftMonth,
  weekdayLabels,
  ymd,
} from '@/lib/booking/calendar';
import { durLbl, madridNow } from '@/lib/time';
import { BRAND_NAME } from '@/lib/brand';
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
  embed = false,
}: {
  slug: string;
  salon: BookingSalon;
  services: BookingService[];
  providers?: BookingProvider[];
  presetServiceId?: string | null;
  presetProviderId?: string | null;
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
    fetchBookingMonthDays(slug, service.id, year, month, providerFilterId).then(r => {
      if (cancelled) return;
      setLoadingMonth(false);
      if (r.ok) setAvailableDays(new Set(r.days));
      else setAvailableDays(new Set());
    });
    return () => { cancelled = true; };
  }, [slug, service, year, month, step, providerFilterId]);

  useEffect(() => {
    if (!service || !selectedDay || step !== 'when') return;
    let cancelled = false;
    setLoadingSlots(true);
    setSlot(null);
    fetchBookingDaySlots(slug, service.id, selectedDay, providerFilterId).then(r => {
      if (cancelled) return;
      setLoadingSlots(false);
      setSlots(r.ok ? r.slots : []);
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
  }

  function goDetails() {
    if (!slot) return;
    setError(null);
    setStep('details');
  }

  function back() {
    setError(null);
    if (step === 'when') {
      if (lockedService) return;
      setService(null);
      setSelectedDay(null);
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
      const r = await submitBooking({
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
        setError(r.message);
        return;
      }
      setConfirm(r);
      setStep('done');
    });
  }

  const when = slot ? formatBookingWhen(slot.starts_at, salon.timezone) : null;
  const shell = embed
    ? 'min-h-full bg-surface-soft'
    : 'min-h-[100dvh] bg-[linear-gradient(165deg,#fff5fa_0%,#f7f7fa_42%,#eef4ff_100%)]';
  const showBack = (step === 'when' && !lockedService) || step === 'details';

  return (
    <div className={shell}>
      <div className={`mx-auto flex w-full flex-col px-4 py-6 sm:px-6 ${embed ? 'max-w-[920px] py-4' : 'max-w-[960px] py-8 sm:py-12'}`}>
        {!embed && (
          <div className="mb-5 flex items-center gap-2 text-caption font-semibold text-ink-3">
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'var(--grad)' }}>
              {BRAND_NAME}
            </span>
            <span aria-hidden>·</span>
            <span>Reserva online</span>
          </div>
        )}

        <div className="overflow-hidden rounded-[28px] border border-surface-line bg-white shadow-lift animate-modalIn">
          <div className="grid md:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
            <aside className="border-b border-surface-line bg-surface-soft/80 p-6 md:border-b-0 md:border-r">
              <p className="text-caption font-semibold uppercase tracking-[0.04em] text-ink-3">
                {salon.name}
              </p>
              <h1 className="mt-2 text-headline font-bold tracking-[-0.02em] text-ink">
                {service ? service.name : 'Reservar cita'}
              </h1>
              {service ? (
                <ul className="mt-5 space-y-3 text-body text-ink-2">
                  <li className="flex items-center gap-2.5">
                    <Clock className="h-4 w-4 shrink-0 text-v" aria-hidden />
                    {durLbl(service.duration_min)}
                  </li>
                  <li className="flex items-center gap-2.5 font-semibold text-ink">
                    <span className="inline-flex h-4 w-4 items-center justify-center text-v" aria-hidden>€</span>
                    {formatPriceCents(service.price_cents)}
                  </li>
                  {lockedProvider && (
                    <li className="flex items-center gap-2.5">
                      <User className="h-4 w-4 shrink-0 text-v" aria-hidden />
                      {lockedProvider.name}
                    </li>
                  )}
                  {when && (
                    <li className="flex items-start gap-2.5">
                      <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-v" aria-hidden />
                      <span>
                        {when.date}
                        <br />
                        <span className="font-semibold text-ink">{when.time}</span>
                      </span>
                    </li>
                  )}
                  {salon.phone && (
                    <li className="flex items-center gap-2.5">
                      <MapPin className="h-4 w-4 shrink-0 text-v" aria-hidden />
                      {salon.phone}
                    </li>
                  )}
                </ul>
              ) : (
                <p className="mt-3 text-body leading-relaxed text-ink-2">
                  {salon.intro ?? 'Elige un servicio para ver la disponibilidad.'}
                </p>
              )}
            </aside>

            <section className="relative min-h-[420px] p-5 sm:p-7">
              {showBack && (
                <button
                  type="button"
                  onClick={back}
                  className="mb-4 inline-flex items-center gap-1.5 text-label font-semibold text-ink-2 transition hover:text-ink"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Atrás
                </button>
              )}

              {step === 'services' && (
                <div>
                  <h2 className="text-title font-bold text-ink">Elige un servicio</h2>
                  <p className="mt-1 text-body text-ink-2">Después escogerás día y hora.</p>
                  <ul className="mt-5 divide-y divide-surface-line overflow-hidden rounded-2xl border border-surface-line">
                    {services.map(s => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => pickService(s)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-v-soft/60"
                        >
                          <span>
                            <span className="block text-body font-semibold text-ink">{s.name}</span>
                            <span className="mt-0.5 block text-caption text-ink-3">
                              {durLbl(s.duration_min)} · {formatPriceCents(s.price_cents)}
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                  {!services.length && (
                    <p className="mt-6 text-body text-ink-2">No hay servicios reservables ahora mismo.</p>
                  )}
                </div>
              )}

              {step === 'when' && service && (
                <div className={`grid gap-6 ${selectedDay ? 'lg:grid-cols-[1fr_200px]' : ''}`}>
                  <div>
                    <h2 className="text-title font-bold text-ink">Selecciona fecha y hora</h2>
                    {lockedService && (
                      <p className="mt-1 text-body text-ink-2">
                        Solo elige cuándo te viene bien
                        {lockedProvider ? ` con ${lockedProvider.name}` : ''}.
                      </p>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-body font-semibold text-ink">{monthTitle(year, month)}</p>
                      <div className="flex gap-1">
                        <NavBtn
                          label="Mes anterior"
                          onClick={() => {
                            const n = shiftMonth(year, month, -1);
                            setYear(n.year);
                            setMonth(n.month);
                            setSelectedDay(null);
                          }}
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </NavBtn>
                        <NavBtn
                          label="Mes siguiente"
                          onClick={() => {
                            const n = shiftMonth(year, month, 1);
                            setYear(n.year);
                            setMonth(n.month);
                            setSelectedDay(null);
                          }}
                        >
                          <ChevronRight className="h-5 w-5" />
                        </NavBtn>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-7 gap-1 text-center">
                      {weekdayLabels().map(d => (
                        <div key={d} className="py-1 text-micro font-semibold uppercase text-ink-3">
                          {d}
                        </div>
                      ))}
                      {monthCells(year, month).map((day, i) => {
                        if (day == null) return <div key={`e-${i}`} />;
                        const key = ymd(year, month, day);
                        const open = availableDays.has(key);
                        const selected = selectedDay === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={!open || loadingMonth}
                            onClick={() => pickDay(day)}
                            className={[
                              'aspect-square rounded-full text-label font-semibold transition',
                              selected
                                ? 'bg-v text-white shadow-hero'
                                : open
                                  ? 'text-ink hover:bg-v-soft'
                                  : 'cursor-default text-ink-3/45',
                            ].join(' ')}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                    {loadingMonth && (
                      <p className="mt-3 text-caption text-ink-3">Comprobando disponibilidad…</p>
                    )}
                  </div>

                  {selectedDay && (
                    <div className="animate-fadeIn">
                      <p className="mb-2 text-caption font-semibold text-ink-2">
                        {new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-ES', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                      <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                        {loadingSlots && (
                          <p className="text-caption text-ink-3">Cargando horas…</p>
                        )}
                        {!loadingSlots && !slots.length && (
                          <p className="text-caption text-ink-2">Sin huecos este día.</p>
                        )}
                        {slots.map(s => {
                          const active = slot?.starts_at === s.starts_at;
                          return (
                            <button
                              key={s.starts_at}
                              type="button"
                              onClick={() => setSlot(s)}
                              className={[
                                'flex w-full items-center justify-center rounded-xl border px-3 py-2.5 text-body font-semibold transition',
                                active
                                  ? 'border-v bg-v text-white'
                                  : 'border-surface-line text-v hover:border-v hover:bg-v-soft',
                              ].join(' ')}
                            >
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                      {slot && (
                        <button
                          type="button"
                          onClick={goDetails}
                          className="mt-4 w-full rounded-pill bg-grad px-4 py-3 text-body font-bold text-white shadow-hero transition hover:opacity-95"
                        >
                          Continuar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {step === 'details' && service && slot && when && (
                <form onSubmit={onSubmit} className="max-w-md animate-fadeIn">
                  <h2 className="text-title font-bold text-ink">Tus datos</h2>
                  <p className="mt-1 text-body text-ink-2">
                    {when.date} · {when.time}
                  </p>

                  <label className="mt-5 block">
                    <span className="text-caption font-semibold text-ink-2">Nombre</span>
                    <input
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      autoComplete="name"
                      className="mt-1.5 w-full rounded-field border border-surface-line bg-white px-3.5 py-3 text-body outline-none ring-v focus:ring-2"
                      placeholder="María López"
                    />
                  </label>
                  <label className="mt-3 block">
                    <span className="text-caption font-semibold text-ink-2">Móvil</span>
                    <input
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      autoComplete="tel"
                      inputMode="tel"
                      className="mt-1.5 w-full rounded-field border border-surface-line bg-white px-3.5 py-3 text-body outline-none ring-v focus:ring-2"
                      placeholder="612 345 678"
                    />
                  </label>
                  <label className="mt-3 block">
                    <span className="text-caption font-semibold text-ink-2">Email (opcional)</span>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="email"
                      className="mt-1.5 w-full rounded-field border border-surface-line bg-white px-3.5 py-3 text-body outline-none ring-v focus:ring-2"
                      placeholder="maria@email.com"
                    />
                  </label>
                  <label className="mt-3 block">
                    <span className="text-caption font-semibold text-ink-2">Nota (opcional)</span>
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      rows={2}
                      className="mt-1.5 w-full resize-none rounded-field border border-surface-line bg-white px-3.5 py-3 text-body outline-none ring-v focus:ring-2"
                      placeholder="Algo que debamos saber…"
                    />
                  </label>

                  {error && (
                    <p className="mt-3 rounded-field border border-danger-line bg-danger-bg px-3 py-2 text-label font-semibold text-danger-fg">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={pending}
                    className="mt-5 w-full rounded-pill bg-grad px-4 py-3.5 text-body font-bold text-white shadow-hero transition hover:opacity-95 disabled:opacity-60"
                  >
                    {pending ? 'Reservando…' : 'Confirmar reserva'}
                  </button>
                </form>
              )}

              {step === 'done' && confirm && (
                <div className="flex max-w-md flex-col items-start animate-fadeIn">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ok-bg text-ok-fg">
                    <Check className="h-7 w-7" strokeWidth={2.5} aria-hidden />
                  </div>
                  <h2 className="mt-4 text-headline font-bold text-ink">Reserva confirmada</h2>
                  <p className="mt-2 text-body leading-relaxed text-ink-2">
                    Hola {confirm.client_name.split(' ')[0]}, tu cita de{' '}
                    <span className="font-semibold text-ink">{confirm.service_name}</span> en{' '}
                    {confirm.salon_name} quedó agendada.
                  </p>
                  {(() => {
                    const w = formatBookingWhen(confirm.starts_at, salon.timezone);
                    return (
                      <div className="mt-5 w-full rounded-2xl border border-surface-line bg-surface-soft px-4 py-3.5 text-body">
                        <p className="font-semibold text-ink">{w.date}</p>
                        <p className="mt-0.5 text-ink-2">
                          {w.time} · {durLbl(confirm.duration_min)}
                        </p>
                      </div>
                    );
                  })()}
                  <p className="mt-4 text-caption text-ink-3">
                    Si necesitas cambiarla, llama al centro
                    {salon.phone ? ` (${salon.phone})` : ''}.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>

        {!embed && (
          <p className="mt-6 text-center text-caption text-ink-3">
            Potenciado por{' '}
            <span className="font-semibold text-ink-2">{BRAND_NAME}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function NavBtn({
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
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-2 transition hover:bg-surface-soft hover:text-ink"
    >
      {children}
    </button>
  );
}
