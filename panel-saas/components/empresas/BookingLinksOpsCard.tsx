'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { usePanelUI } from '@/context/PanelUIContext';
import {
  buildBookingEmbedUrl,
  buildBookingIframe,
  buildBookingPageUrl,
  type LiveBookingLinks,
} from '@/lib/live-booking';
import { marlenAppUrl } from '@/lib/marlen-app-url';

export default function BookingLinksOpsCard({ booking }: { booking: LiveBookingLinks }) {
  const { toast } = usePanelUI();
  const origin = marlenAppUrl();
  const [copied, setCopied] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState('');
  const [providerId, setProviderId] = useState('');

  const slug = booking.slug;
  const globalPage = slug ? buildBookingPageUrl(origin, slug) : '';
  const adPreset = useMemo(
    () => ({ serviceId: serviceId || null, providerId: providerId || null }),
    [serviceId, providerId],
  );
  const adPage = slug && serviceId ? buildBookingPageUrl(origin, slug, adPreset) : '';
  const adEmbed = slug && serviceId ? buildBookingEmbedUrl(origin, slug, adPreset) : '';
  const adIframe = adEmbed
    ? buildBookingIframe(
        adEmbed,
        booking.services.find(s => s.id === serviceId)?.name ?? 'Reservar cita',
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
        <h2 className="text-[16px] font-bold">Reserva online / anuncios</h2>
        <p className="mt-2 text-[14px] text-ink-2">
          Este centro aún no tiene slug de booking. Actívalo en la migración o en Ajustes del centro.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-card bg-white p-5">
      <div>
        <h2 className="text-[16px] font-bold">Reserva online / anuncios</h2>
        <p className="mt-1 text-[13px] text-ink-2">
          {booking.enabled
            ? `${booking.salonName} · calendario global y enlaces con servicio preseleccionado para ads.`
            : 'Booking pausado en este centro.'}
        </p>
      </div>

      <div className="rounded-[14px] border border-line bg-page/60 px-3.5 py-3">
        <p className="text-[12px] font-bold uppercase tracking-wide text-ink-3">Calendario global</p>
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
          Widget / enlace para ads
        </p>
        <p className="mt-1 text-[13px] text-ink-2">
          Preselecciona servicio (y opcionalmente cabina) para no alargar el embudo del anuncio.
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

        <label className="mt-2.5 block">
          <span className="text-[12px] font-semibold text-ink-2">Cabina / profesional (opcional)</span>
          <select
            value={providerId}
            onChange={e => setProviderId(e.target.value)}
            disabled={!serviceId}
            className="mt-1 h-[42px] w-full rounded-[12px] border border-line bg-white px-3 text-[14px] outline-none disabled:opacity-50"
          >
            <option value="">Cualquiera disponible</option>
            {booking.providers.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

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
