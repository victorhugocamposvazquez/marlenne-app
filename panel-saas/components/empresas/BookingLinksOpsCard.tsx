'use client';

import { useMemo, useState, useTransition, type ReactNode } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { usePanelUI } from '@/context/PanelUIContext';
import {
  opsCreateBookingLink,
  opsSaveBookingAccent,
  opsSaveBookingNotify,
  opsSetBookingEnabled,
} from '@/app/actions/live-booking-ops';
import {
  buildBookingEmbedUrl,
  buildBookingIframe,
  buildBookingPageUrl,
  publicOptionSlug,
  type LiveBookingLinks,
} from '@/lib/live-booking';
import { marlenAppUrl } from '@/lib/marlen-app-url';

const MODE_LABEL = {
  free: 'Sin pago',
  pay_full: 'Pago íntegro',
  pay_deposit: 'Señal',
} as const;

export default function BookingLinksOpsCard({ booking }: { booking: LiveBookingLinks }) {
  const { toast } = usePanelUI();
  const origin = marlenAppUrl();
  const [copied, setCopied] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [titlesByService, setTitlesByService] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState(booking.enabled);
  const [notifyEmail, setNotifyEmail] = useState(booking.notifyEmail ?? '');
  const [accent, setAccent] = useState(booking.accent ?? '#006bff');
  const [savedLinks, setSavedLinks] = useState(booking.savedLinks);
  const [newLabel, setNewLabel] = useState('');
  const [newMode, setNewMode] = useState<'free' | 'pay_full' | 'pay_deposit'>('free');
  const [pending, startTransition] = useTransition();

  const slug = booking.slug;
  const serviceTitle = serviceId ? (titlesByService[serviceId] ?? '') : '';
  const cleanTitle = serviceTitle.trim().slice(0, 80) || null;
  const globalPage = slug ? buildBookingPageUrl(origin, slug) : '';
  const selectedService = booking.services.find(s => s.id === serviceId) ?? null;
  const selectedProvider = booking.providers.find(p => p.id === providerId) ?? null;
  const adPreset = useMemo(
    () => ({
      serviceSlug: selectedService ? publicOptionSlug(selectedService) : null,
      providerSlug: selectedProvider ? publicOptionSlug(selectedProvider) : null,
      title: cleanTitle,
    }),
    [selectedService, selectedProvider, cleanTitle],
  );
  const adPage = slug && serviceId ? buildBookingPageUrl(origin, slug, adPreset) : '';
  const adEmbed = slug && serviceId ? buildBookingEmbedUrl(origin, slug, adPreset) : '';
  const adIframe = adEmbed
    ? buildBookingIframe(
        adEmbed,
        cleanTitle || booking.services.find(s => s.id === serviceId)?.name || 'Reservar cita',
      )
    : '';

  async function copy(kind: string, text: string, msg: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      toast(msg);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      toast('No se pudo copiar');
    }
  }

  if (!slug) {
    return (
      <div className="rounded-card bg-white p-5">
        <h2 className="text-[16px] font-bold">Reserva online</h2>
        <p className="mt-2 text-[14px] text-ink-2">
          Este centro aún no tiene slug de booking. Actívalo en Ajustes → Widget reservas de la app.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-card bg-white p-5">
      <div>
        <h2 className="text-[16px] font-bold">Reserva online</h2>
        <p className="mt-1 text-[13px] text-ink-2">
          {booking.salonName} · paridad ops: enlaces, cobro, avisos y color.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-line bg-page/60 px-3.5 py-3">
        <label className="inline-flex items-center gap-2 text-[13px] font-semibold">
          <input
            type="checkbox"
            checked={enabled}
            disabled={pending}
            onChange={e => {
              const next = e.target.checked;
              setEnabled(next);
              startTransition(async () => {
                const r = await opsSetBookingEnabled(next);
                if (!r.ok) {
                  setEnabled(!next);
                  toast(r.error);
                  return;
                }
                toast(next ? 'Booking activado' : 'Booking pausado');
              });
            }}
          />
          Booking activo
        </label>
        <label className="inline-flex items-center gap-2 text-[13px] font-semibold">
          Color
          <input
            type="color"
            value={accent}
            disabled={pending}
            onChange={e => setAccent(e.target.value)}
            onBlur={() => {
              startTransition(async () => {
                const r = await opsSaveBookingAccent(accent);
                toast(r.ok ? 'Color guardado' : r.error);
              });
            }}
            className="h-8 w-10 cursor-pointer rounded border border-line bg-white p-0.5"
          />
        </label>
      </div>

      <div className="rounded-[14px] border border-line bg-page/60 px-3.5 py-3">
        <p className="text-[12px] font-bold uppercase tracking-wide text-ink-3">Avisos</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            type="email"
            value={notifyEmail}
            onChange={e => setNotifyEmail(e.target.value)}
            placeholder="Email del centro"
            className="h-[42px] min-w-[220px] flex-1 rounded-[12px] border border-line bg-white px-3 text-[14px]"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const r = await opsSaveBookingNotify(notifyEmail);
                toast(r.ok ? 'Email de avisos guardado' : r.error);
              });
            }}
            className="h-[42px] rounded-pill bg-ink px-4 text-[12px] font-semibold text-white"
          >
            Guardar
          </button>
        </div>
      </div>

      <div className="rounded-[14px] border border-line bg-page/60 px-3.5 py-3">
        <p className="text-[12px] font-bold uppercase tracking-wide text-ink-3">Calendario completo</p>
        <p className="mt-1 break-all text-[13px] font-semibold text-ink">{globalPage}</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <MiniCopy
            active={copied === 'g'}
            onClick={() => copy('g', globalPage, 'Enlace global copiado')}
          >
            Copiar
          </MiniCopy>
          <a
            href={globalPage}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-pill border border-line bg-white px-3 text-[12px] font-semibold"
          >
            <ExternalLink size={13} /> Abrir
          </a>
        </div>
      </div>

      <div className="rounded-[14px] border border-line bg-page/60 px-3.5 py-3">
        <p className="text-[12px] font-bold uppercase tracking-wide text-ink-3">
          Enlaces guardados (modos de cobro)
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <input
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="Nombre interno"
            className="h-[42px] rounded-[12px] border border-line bg-white px-3 text-[14px] sm:col-span-1"
          />
          <select
            value={newMode}
            onChange={e => setNewMode(e.target.value as typeof newMode)}
            className="h-[42px] rounded-[12px] border border-line bg-white px-3 text-[14px]"
          >
            <option value="free">Sin pago</option>
            <option value="pay_full">Pago íntegro</option>
            <option value="pay_deposit">Señal 30%</option>
          </select>
          <button
            type="button"
            disabled={pending || !newLabel.trim()}
            onClick={() => {
              startTransition(async () => {
                const r = await opsCreateBookingLink({
                  label: newLabel,
                  paymentMode: newMode,
                  serviceId: serviceId || null,
                  customTitle: cleanTitle,
                });
                if (!r.ok) {
                  toast(r.error);
                  return;
                }
                setSavedLinks(prev => [r.link, ...prev]);
                setNewLabel('');
                toast('Enlace creado');
              });
            }}
            className="h-[42px] rounded-pill bg-ink px-4 text-[12px] font-semibold text-white disabled:opacity-40"
          >
            Crear
          </button>
        </div>
        {savedLinks.length > 0 && (
          <ul className="mt-3 space-y-2">
            {savedLinks.map(link => {
              const url = buildBookingPageUrl(origin, slug, { linkKey: link.link_key });
              return (
                <li key={link.id} className="rounded-[12px] border border-line bg-white px-3 py-2">
                  <p className="text-[13px] font-bold">
                    {link.label || link.link_key} · {MODE_LABEL[link.payment_mode]}
                  </p>
                  <p className="mt-0.5 break-all font-mono text-[11px] text-ink-3">{url}</p>
                  <div className="mt-1.5">
                    <MiniCopy
                      active={copied === link.id}
                      onClick={() => copy(link.id, url, 'Enlace guardado copiado')}
                    >
                      Copiar
                    </MiniCopy>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-[14px] border border-line bg-page/60 px-3.5 py-3">
        <p className="text-[12px] font-bold uppercase tracking-wide text-ink-3">
          Enlace rápido de un servicio
        </p>
        <label className="mt-3 block">
          <span className="text-[12px] font-semibold text-ink-2">Servicio</span>
          <select
            value={serviceId}
            onChange={e => {
              setServiceId(e.target.value);
              setProviderId('');
            }}
            className="mt-1 h-[42px] w-full rounded-[12px] border border-line bg-white px-3 text-[14px] outline-none"
          >
            <option value="">Elige un servicio…</option>
            {booking.services.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>

        {serviceId && (
          <>
            <label className="mt-2.5 block">
              <span className="text-[12px] font-semibold text-ink-2">Título del widget (opcional)</span>
              <input
                value={serviceTitle}
                onChange={e => setTitlesByService(prev => ({
                  ...prev,
                  [serviceId]: e.target.value.slice(0, 80),
                }))}
                maxLength={80}
                placeholder={
                  selectedService
                    ? `Ej. Reserva tu ${selectedService.name.toLowerCase()}`
                    : 'Ej. Reserva tu cavitación'
                }
                className="mt-1 h-[42px] w-full rounded-[12px] border border-line bg-white px-3 text-[14px] outline-none"
              />
            </label>

            <label className="mt-2.5 block">
              <span className="text-[12px] font-semibold text-ink-2">Cabina / profesional (opcional)</span>
              <select
                value={providerId}
                onChange={e => setProviderId(e.target.value)}
                className="mt-1 h-[42px] w-full rounded-[12px] border border-line bg-white px-3 text-[14px] outline-none"
              >
                <option value="">Cualquiera disponible</option>
                {booking.providers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
          </>
        )}

        {adPage ? (
          <div className="mt-3">
            <p className="break-all text-[13px] font-semibold text-ink">{adPage}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <MiniCopy
                active={copied === 'ad'}
                onClick={() => copy('ad', adPage, 'Enlace de anuncio copiado')}
              >
                Copiar enlace
              </MiniCopy>
              <MiniCopy
                active={copied === 'ad-embed'}
                onClick={() => copy('ad-embed', adIframe, 'Widget copiado')}
              >
                Copiar widget
              </MiniCopy>
              <a
                href={adPage}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-pill border border-line bg-white px-3 text-[12px] font-semibold"
              >
                <ExternalLink size={13} /> Probar
              </a>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[12px] text-ink-3">Elige un servicio para generar el enlace.</p>
        )}
      </div>
    </div>
  );
}

function MiniCopy({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-pill border border-line bg-white px-3 text-[12px] font-semibold"
    >
      {active ? <Check size={13} className="text-[#15803D]" /> : <Copy size={13} />}
      {children}
    </button>
  );
}
