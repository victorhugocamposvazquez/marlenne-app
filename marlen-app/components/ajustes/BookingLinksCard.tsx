'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Eye, ExternalLink, X } from 'lucide-react';
import AjustesSection from '@/components/ajustes/AjustesSection';
import { useToast } from '@/components/Toast';
import { publicProviderSlug, publicServiceSlug } from '@/lib/booking/resolve';
import {
  bookingEmbedUrl,
  bookingIframeCode,
  bookingPageUrl,
  sanitizeBookingTitle,
} from '@/lib/booking/urls';

export type BookingLinkOption = { id: string; name: string; slug?: string | null };

const fieldCls =
  'mt-1.5 w-full rounded-field border border-surface-line bg-white px-3 py-2.5 text-body outline-none ring-v focus:ring-2';

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
  /** Título personalizado por servicio (solo widgets de anuncio). */
  const [titlesByService, setTitlesByService] = useState<Record<string, string>>({});
  const [previewKind, setPreviewKind] = useState<'global' | 'ad' | null>(null);

  const selectedService = services.find(s => s.id === serviceId) ?? null;
  const selectedProvider = providers.find(p => p.id === providerId) ?? null;
  const serviceTitle = serviceId ? (titlesByService[serviceId] ?? '') : '';
  const cleanTitle = sanitizeBookingTitle(serviceTitle);

  const adPreset = useMemo(
    () => ({
      serviceSlug: selectedService ? publicServiceSlug(selectedService) : null,
      providerSlug: selectedProvider ? publicProviderSlug(selectedProvider) : null,
      title: cleanTitle,
    }),
    [selectedService, selectedProvider, cleanTitle],
  );

  const globalPage = slug ? bookingPageUrl(origin, slug) : '';
  const globalEmbed = slug ? bookingEmbedUrl(origin, slug) : '';
  const globalIframe = globalEmbed ? bookingIframeCode(globalEmbed) : '';

  const adPage = slug && serviceId ? bookingPageUrl(origin, slug, adPreset) : '';
  const adEmbed = slug && serviceId ? bookingEmbedUrl(origin, slug, adPreset) : '';
  const adLabel = cleanTitle || selectedService?.name || 'Reservar cita';
  const adIframe = adEmbed ? bookingIframeCode(adEmbed, adLabel) : '';

  const previewSrc =
    previewKind === 'global' ? globalEmbed
    : previewKind === 'ad' && adEmbed ? adEmbed
    : '';

  function setServiceTitle(value: string) {
    if (!serviceId) return;
    setTitlesByService(prev => ({ ...prev, [serviceId]: value.slice(0, 80) }));
  }

  function onPickService(nextId: string) {
    setServiceId(nextId);
    setProviderId('');
    if (!nextId) {
      setPreviewKind(p => (p === 'ad' ? null : p));
      return;
    }
    // Si ya había preview abierta (p. ej. global), pásala al widget de ese servicio.
    setPreviewKind(p => (p ? 'ad' : p));
  }

  const closePreview = useCallback(() => setPreviewKind(null), []);

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
      <div className="grid gap-5 min-[1024px]:grid-cols-2 min-[1024px]:items-start">
        <AjustesSection title="Calendario global" className="mt-0">
          <div className="space-y-3 py-4">
            <p className="text-body leading-snug text-ink-2">
              {enabled
                ? 'La clienta elige servicio, día y hora.'
                : 'El enlace existe pero la reserva está pausada.'}
            </p>
            <p className="break-all text-label font-semibold text-ink">{globalPage}</p>
            <ActionRow>
              <CopyBtn active={copied === 'page'} onClick={() => copy('page', globalPage, 'Enlace copiado')}>
                Copiar enlace
              </CopyBtn>
              <CopyBtn active={copied === 'embed'} onClick={() => copy('embed', globalIframe, 'Código embed copiado')}>
                Copiar widget
              </CopyBtn>
              <PreviewBtn onClick={() => setPreviewKind('global')} />
              <OpenLink href={globalPage} />
            </ActionRow>
          </div>
        </AjustesSection>

        <AjustesSection title="Widget para anuncios" className="mt-0">
          <div className="space-y-3 py-4">
            <p className="text-body leading-snug text-ink-2">
              Servicio precargado y título de embudo solo para ese servicio.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2 min-[1024px]:col-span-1">
                <span className="text-caption font-semibold text-ink-2">Servicio</span>
                <select
                  value={serviceId}
                  onChange={e => onPickService(e.target.value)}
                  className={fieldCls}
                >
                  <option value="">Elige un servicio…</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>

              {serviceId && (
                <>
                  <label className="block sm:col-span-2 min-[1024px]:col-span-1">
                    <span className="text-caption font-semibold text-ink-2">
                      Título del widget (opcional)
                    </span>
                    <input
                      value={serviceTitle}
                      onChange={e => setServiceTitle(e.target.value)}
                      maxLength={80}
                      placeholder={
                        selectedService
                          ? `Ej. Reserva tu ${selectedService.name.toLowerCase()}`
                          : 'Ej. Reserva tu cavitación'
                      }
                      className={fieldCls}
                    />
                    <span className="mt-1 block text-caption text-ink-3">
                      {serviceTitle.length}/80 · vacío = «{selectedService?.name}»
                    </span>
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="text-caption font-semibold text-ink-2">
                      Cabina / profesional (opcional)
                    </span>
                    <select
                      value={providerId}
                      onChange={e => setProviderId(e.target.value)}
                      className={fieldCls}
                    >
                      <option value="">Cualquiera disponible</option>
                      {providers.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </label>

                  <div className="space-y-3 sm:col-span-2">
                    <p className="break-all text-label font-semibold text-ink">{adPage}</p>
                    <ActionRow>
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
                      <PreviewBtn onClick={() => setPreviewKind('ad')} />
                      <OpenLink href={adPage} />
                    </ActionRow>
                  </div>
                </>
              )}
            </div>

            {!serviceId && (
              <p className="text-caption text-ink-3">Elige un servicio para configurar el widget.</p>
            )}
          </div>
        </AjustesSection>
      </div>

      {previewSrc && (
        <PreviewModal
          src={previewSrc}
          title={previewKind === 'ad' ? 'Vista previa · anuncio' : 'Vista previa · global'}
          onClose={closePreview}
        />
      )}
    </div>
  );
}

function PreviewModal({
  src,
  title,
  onClose,
}: {
  src: string;
  title: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-ink/45 p-0 backdrop-blur-[6px] sm:items-center sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-preview-title"
        className="flex max-h-[100dvh] w-full max-w-[960px] flex-col overflow-hidden rounded-t-[20px] bg-white shadow-popup sm:max-h-[min(900px,92dvh)] sm:rounded-[20px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-surface-line px-4 py-3 sm:px-5">
          <h2 id="booking-preview-title" className="min-w-0 flex-1 text-body font-bold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar vista previa"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-2 transition hover:bg-surface-soft hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="shrink-0 px-4 pt-2 text-caption text-ink-2 sm:px-5">
          Así lo verá la clienta. Cambia título o cabina y se actualiza al instante.
        </p>
        <div className="min-h-0 flex-1 overflow-hidden px-2 pb-2 pt-2 sm:px-4 sm:pb-4">
          <div className="h-full min-h-[min(70dvh,640px)] overflow-hidden rounded-2xl border border-surface-line bg-surface-soft sm:min-h-[min(72dvh,700px)]">
            <iframe
              key={src}
              src={src}
              title="Vista previa del widget de reservas"
              className="h-full min-h-[min(70dvh,640px)] w-full border-0 sm:min-h-[min(72dvh,700px)]"
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ActionRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function OpenLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-pill border border-surface-line px-3 py-1.5 text-caption font-semibold text-ink"
    >
      <ExternalLink className="h-3.5 w-3.5" />
      Abrir
    </a>
  );
}

function PreviewBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-pill border border-surface-line px-3 py-1.5 text-caption font-semibold text-ink"
    >
      <Eye className="h-3.5 w-3.5" />
      Vista previa
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
