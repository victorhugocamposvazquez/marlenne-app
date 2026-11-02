'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import AjustesSection from '@/components/ajustes/AjustesSection';
import { useToast } from '@/components/Toast';
import {
  bookingEmbedUrl,
  bookingIframeCode,
  bookingPageUrl,
} from '@/lib/booking/urls';

export type BookingLinkOption = { id: string; name: string };

export default function BookingLinksCard({
  slug,
  enabled,
  origin,
  services,
  providers,
}: {
  slug: string | null;
  enabled: boolean;
  origin: string;
  services: BookingLinkOption[];
  providers: BookingLinkOption[];
}) {
  const toast = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState('');
  const [providerId, setProviderId] = useState('');

  const globalPage = slug ? bookingPageUrl(origin, slug) : '';
  const globalEmbed = slug ? bookingEmbedUrl(origin, slug) : '';
  const globalIframe = globalEmbed ? bookingIframeCode(globalEmbed) : '';

  const adPreset = useMemo(
    () => ({
      serviceId: serviceId || null,
      providerId: providerId || null,
    }),
    [serviceId, providerId],
  );

  const adPage = slug && serviceId ? bookingPageUrl(origin, slug, adPreset) : '';
  const adEmbed = slug && serviceId ? bookingEmbedUrl(origin, slug, adPreset) : '';
  const adIframe = adEmbed
    ? bookingIframeCode(adEmbed, services.find(s => s.id === serviceId)?.name ?? 'Reservar cita')
    : '';

  async function copy(kind: string, text: string, okMsg: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      toast(okMsg);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      toast('No se pudo copiar');
    }
  }

  if (!slug) {
    return (
      <AjustesSection title="Reserva online">
        <p className="py-4 text-body leading-snug text-ink-2">
          Aún no hay página pública. Cuando se active el booking del centro, aquí
          verás el enlace tipo Calendly y el código para embeberlo.
        </p>
      </AjustesSection>
    );
  }

  return (
    <AjustesSection title="Reserva online">
      <div className="space-y-5 py-4">
        <p className="text-body leading-snug text-ink-2">
          {enabled
            ? 'Calendario global para la web, y enlaces directos para anuncios (servicio ya elegido).'
            : 'El enlace existe pero la reserva está pausada.'}
        </p>

        <LinkBlock
          title="Calendario global"
          hint="La clienta elige servicio, día y hora."
          url={globalPage}
          copied={copied === 'page'}
          onCopy={() => copy('page', globalPage, 'Enlace copiado')}
          onCopyEmbed={() => copy('embed', globalIframe, 'Código embed copiado')}
          embedCopied={copied === 'embed'}
        />

        <div className="rounded-field border border-surface-line bg-white px-3 py-3">
          <p className="text-caption font-semibold text-ink-3">Enlace para anuncios</p>
          <p className="mt-1 text-caption leading-snug text-ink-2">
            Salta el paso del servicio (ej. anuncio de cavitación) para no alargar el embudo.
          </p>

          <label className="mt-3 block">
            <span className="text-caption font-semibold text-ink-2">Servicio</span>
            <select
              value={serviceId}
              onChange={e => {
                setServiceId(e.target.value);
                setProviderId('');
              }}
              className="mt-1.5 w-full rounded-field border border-surface-line bg-white px-3 py-2.5 text-body outline-none ring-v focus:ring-2"
            >
              <option value="">Elige un servicio…</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>

          <label className="mt-3 block">
            <span className="text-caption font-semibold text-ink-2">
              Cabina / profesional (opcional)
            </span>
            <select
              value={providerId}
              onChange={e => setProviderId(e.target.value)}
              disabled={!serviceId}
              className="mt-1.5 w-full rounded-field border border-surface-line bg-white px-3 py-2.5 text-body outline-none ring-v focus:ring-2 disabled:opacity-50"
            >
              <option value="">Cualquiera disponible</option>
              {providers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          {adPage ? (
            <div className="mt-3 space-y-3">
              <p className="break-all text-label font-semibold text-ink">{adPage}</p>
              <div className="flex flex-wrap gap-2">
                <CopyBtn
                  active={copied === 'ad-page'}
                  onClick={() => copy('ad-page', adPage, 'Enlace de anuncio copiado')}
                >
                  Copiar enlace
                </CopyBtn>
                <CopyBtn
                  active={copied === 'ad-embed'}
                  onClick={() => copy('ad-embed', adIframe, 'Widget de anuncio copiado')}
                >
                  Copiar widget
                </CopyBtn>
                <a
                  href={adPage}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-pill border border-surface-line px-3 py-1.5 text-caption font-semibold text-ink"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Probar
                </a>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-caption text-ink-3">Elige un servicio para generar el enlace.</p>
          )}
        </div>
      </div>
    </AjustesSection>
  );
}

function LinkBlock({
  title,
  hint,
  url,
  copied,
  embedCopied,
  onCopy,
  onCopyEmbed,
}: {
  title: string;
  hint: string;
  url: string;
  copied: boolean;
  embedCopied: boolean;
  onCopy: () => void;
  onCopyEmbed: () => void;
}) {
  return (
    <div className="rounded-field border border-surface-line bg-white px-3 py-3">
      <p className="text-caption font-semibold text-ink-3">{title}</p>
      <p className="mt-1 text-caption leading-snug text-ink-2">{hint}</p>
      <p className="mt-2 break-all text-label font-semibold text-ink">{url}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <CopyBtn active={copied} onClick={onCopy}>Copiar</CopyBtn>
        <CopyBtn active={embedCopied} onClick={onCopyEmbed}>Copiar widget</CopyBtn>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-pill border border-surface-line px-3 py-1.5 text-caption font-semibold text-ink"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir
        </a>
      </div>
    </div>
  );
}

function CopyBtn({
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
      className="inline-flex items-center gap-1.5 rounded-pill border border-surface-line px-3 py-1.5 text-caption font-semibold text-ink"
    >
      {active ? <Check className="h-3.5 w-3.5 text-ok-fg" /> : <Copy className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}
