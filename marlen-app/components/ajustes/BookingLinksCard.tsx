'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Check, Copy, Eye, EyeOff, ExternalLink } from 'lucide-react';
import AjustesSection from '@/components/ajustes/AjustesSection';
import { useToast } from '@/components/Toast';
import {
  bookingEmbedUrl,
  bookingIframeCode,
  bookingPageUrl,
  sanitizeBookingTitle,
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
  const [title, setTitle] = useState('');
  const [previewKind, setPreviewKind] = useState<'global' | 'ad' | null>(null);

  const cleanTitle = sanitizeBookingTitle(title);

  const globalPreset = useMemo(
    () => ({ title: cleanTitle }),
    [cleanTitle],
  );
  const adPreset = useMemo(
    () => ({
      serviceId: serviceId || null,
      providerId: providerId || null,
      title: cleanTitle,
    }),
    [serviceId, providerId, cleanTitle],
  );

  const globalPage = slug ? bookingPageUrl(origin, slug, globalPreset) : '';
  const globalEmbed = slug ? bookingEmbedUrl(origin, slug, globalPreset) : '';
  const globalIframe = globalEmbed
    ? bookingIframeCode(globalEmbed, cleanTitle ?? 'Reservar cita')
    : '';

  const adPage = slug && serviceId ? bookingPageUrl(origin, slug, adPreset) : '';
  const adEmbed = slug && serviceId ? bookingEmbedUrl(origin, slug, adPreset) : '';
  const adLabel =
    cleanTitle
    || services.find(s => s.id === serviceId)?.name
    || 'Reservar cita';
  const adIframe = adEmbed ? bookingIframeCode(adEmbed, adLabel) : '';

  const previewSrc =
    previewKind === 'global' ? globalEmbed
    : previewKind === 'ad' ? adEmbed
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
      <AjustesSection title="Widget de reservas">
        <p className="py-4 text-body leading-snug text-ink-2">
          Aún no hay página pública. Cuando se active el booking del centro, aquí
          podrás crear el calendario global y widgets para anuncios.
        </p>
      </AjustesSection>
    );
  }

  return (
    <div className="space-y-5">
      <AjustesSection title="Título del widget">
        <div className="space-y-3 py-4">
          <p className="text-body leading-snug text-ink-2">
            Opcional. Sustituye el título genérico (ideal para anuncios:
            «Reserva tu cavitación» en lugar del nombre del servicio).
          </p>
          <label className="block">
            <span className="text-caption font-semibold text-ink-2">Título personalizado</span>
            <input
              value={title}
              onChange={e => setTitle(e.target.value.slice(0, 80))}
              maxLength={80}
              placeholder="Ej. Reserva tu cavitación"
              className="mt-1.5 w-full rounded-field border border-surface-line bg-white px-3 py-2.5 text-body outline-none ring-v focus:ring-2"
            />
            <span className="mt-1 block text-caption text-ink-3">{title.length}/80</span>
          </label>
        </div>
      </AjustesSection>

      <AjustesSection title="Calendario global">
        <div className="space-y-3 py-4">
          <p className="text-body leading-snug text-ink-2">
            {enabled
              ? 'La clienta elige servicio, día y hora.'
              : 'El enlace existe pero la reserva está pausada.'}
          </p>
          <p className="break-all text-label font-semibold text-ink">{globalPage}</p>
          <div className="flex flex-wrap gap-2">
            <CopyBtn active={copied === 'page'} onClick={() => copy('page', globalPage, 'Enlace copiado')}>
              Copiar enlace
            </CopyBtn>
            <CopyBtn active={copied === 'embed'} onClick={() => copy('embed', globalIframe, 'Código embed copiado')}>
              Copiar widget
            </CopyBtn>
            <PreviewBtn
              active={previewKind === 'global'}
              onClick={() => setPreviewKind(p => (p === 'global' ? null : 'global'))}
            />
            <a
              href={globalPage}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-pill border border-surface-line px-3 py-1.5 text-caption font-semibold text-ink"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir
            </a>
          </div>
        </div>
      </AjustesSection>

      <AjustesSection title="Widget para anuncios">
        <div className="space-y-3 py-4">
          <p className="text-body leading-snug text-ink-2">
            Servicio (y cabina) ya elegidos para no alargar el embudo del anuncio.
          </p>

          <label className="block">
            <span className="text-caption font-semibold text-ink-2">Servicio</span>
            <select
              value={serviceId}
              onChange={e => {
                setServiceId(e.target.value);
                setProviderId('');
                if (previewKind === 'ad') setPreviewKind(null);
              }}
              className="mt-1.5 w-full rounded-field border border-surface-line bg-white px-3 py-2.5 text-body outline-none ring-v focus:ring-2"
            >
              <option value="">Elige un servicio…</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>

          <label className="block">
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
            <div className="space-y-3">
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
                <PreviewBtn
                  active={previewKind === 'ad'}
                  onClick={() => setPreviewKind(p => (p === 'ad' ? null : 'ad'))}
                />
                <a
                  href={adPage}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-pill border border-surface-line px-3 py-1.5 text-caption font-semibold text-ink"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir
                </a>
              </div>
            </div>
          ) : (
            <p className="text-caption text-ink-3">Elige un servicio para generar el enlace.</p>
          )}
        </div>
      </AjustesSection>

      {previewSrc && (
        <AjustesSection title="Vista previa">
          <div className="space-y-3 py-4">
            <p className="text-caption leading-snug text-ink-2">
              Así lo verá la clienta. Los cambios de título, servicio o cabina se reflejan al instante.
            </p>
            <div className="overflow-hidden rounded-2xl border border-surface-line bg-white shadow-lift">
              <iframe
                key={previewSrc}
                src={previewSrc}
                title="Vista previa del widget de reservas"
                className="h-[min(720px,70dvh)] w-full border-0"
              />
            </div>
          </div>
        </AjustesSection>
      )}
    </div>
  );
}

function PreviewBtn({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-pill border border-surface-line px-3 py-1.5 text-caption font-semibold text-ink"
    >
      {active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      {active ? 'Ocultar' : 'Vista previa'}
    </button>
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
