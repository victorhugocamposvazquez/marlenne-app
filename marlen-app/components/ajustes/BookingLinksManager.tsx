'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Plus, Trash2 } from 'lucide-react';
import {
  deleteBookingLink,
  saveBookingLink,
  type BookingLinkRow,
} from '@/app/actions/booking-links';
import AjustesSection from '@/components/ajustes/AjustesSection';
import { useToast } from '@/components/Toast';
import type { BookingLinkOption } from '@/components/ajustes/BookingLinksCard';
import { bookingPageUrl } from '@/lib/booking/urls';
import type { BookingPaymentMode } from '@/lib/booking/types';

const fieldCls =
  'mt-1.5 w-full rounded-field border border-surface-line bg-white px-3 py-2.5 text-body outline-none ring-v focus:ring-2';

const MODE_LABEL: Record<BookingPaymentMode, string> = {
  free: 'Sin pago (Google / captura)',
  pay_full: 'Pago íntegro con tarjeta',
  pay_deposit: 'Señal (pago parcial)',
};

export default function BookingLinksManager({
  origin,
  salonSlug,
  services,
  providers,
  initialLinks,
}: {
  origin: string;
  salonSlug: string | null;
  services: BookingLinkOption[];
  providers: BookingLinkOption[];
  initialLinks: BookingLinkRow[];
}) {
  const toast = useToast();
  const router = useRouter();
  const [links, setLinks] = useState(initialLinks);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);

  const [label, setLabel] = useState('');
  const [title, setTitle] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [mode, setMode] = useState<BookingPaymentMode>('free');
  const [depositPct, setDepositPct] = useState(30);

  const canCreate = !!salonSlug;

  function create() {
    if (!canCreate) return;
    startTransition(async () => {
      const r = await saveBookingLink({
        label,
        customTitle: title || null,
        serviceId: serviceId || null,
        providerId: providerId || null,
        paymentMode: mode,
        depositBps: Math.round(depositPct * 100),
      });
      if (!r.ok) {
        toast(r.error);
        return;
      }
      setLinks(prev => [r.link, ...prev]);
      setLabel('');
      setTitle('');
      setServiceId('');
      setProviderId('');
      setMode('free');
      setDepositPct(30);
      toast('Enlace creado');
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const r = await deleteBookingLink(id);
      if (!r.ok) {
        toast(r.error);
        return;
      }
      setLinks(prev => prev.filter(l => l.id !== id));
      toast('Enlace eliminado');
      router.refresh();
    });
  }

  async function copyUrl(link: BookingLinkRow) {
    if (!salonSlug) return;
    const url = bookingPageUrl(origin, salonSlug, { linkKey: link.link_key });
    try {
      await navigator.clipboard.writeText(url);
      setCopied(link.id);
      toast('Enlace copiado');
      setTimeout(() => setCopied(null), 1600);
    } catch {
      toast('No se pudo copiar');
    }
  }

  const sorted = useMemo(() => links, [links]);

  return (
    <AjustesSection title="Enlaces con modo de cobro" className="mt-0">
      <div className="space-y-4 py-4">
        <p className="text-body leading-snug text-ink-2">
          Crea enlaces guardados: gratis (ideal Google), pago íntegro o señal. El modo viaja en la URL
          {' '}<span className="font-mono text-caption">/r/…/l/clave</span>.
        </p>

        {!canCreate ? (
          <p className="text-caption text-ink-3">Activa el slug de booking para crear enlaces.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-caption font-semibold text-ink-2">Nombre interno</span>
              <input
                className={fieldCls}
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="Ads cavitación · señal"
              />
            </label>
            <label className="block">
              <span className="text-caption font-semibold text-ink-2">Título público</span>
              <input
                className={fieldCls}
                value={title}
                onChange={e => setTitle(e.target.value.slice(0, 80))}
                placeholder="Reserva tu cavitación"
              />
            </label>
            <label className="block">
              <span className="text-caption font-semibold text-ink-2">Servicio (opcional)</span>
              <select
                className={fieldCls}
                value={serviceId}
                onChange={e => setServiceId(e.target.value)}
              >
                <option value="">Calendario completo</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-caption font-semibold text-ink-2">Profesional (opcional)</span>
              <select
                className={fieldCls}
                value={providerId}
                onChange={e => setProviderId(e.target.value)}
              >
                <option value="">Cualquiera</option>
                {providers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-caption font-semibold text-ink-2">Modo de cobro</span>
              <select
                className={fieldCls}
                value={mode}
                onChange={e => setMode(e.target.value as BookingPaymentMode)}
              >
                {(Object.keys(MODE_LABEL) as BookingPaymentMode[]).map(m => (
                  <option key={m} value={m}>{MODE_LABEL[m]}</option>
                ))}
              </select>
            </label>
            {mode === 'pay_deposit' && (
              <label className="block">
                <span className="text-caption font-semibold text-ink-2">Señal (%)</span>
                <input
                  type="number"
                  min={5}
                  max={100}
                  className={fieldCls}
                  value={depositPct}
                  onChange={e => setDepositPct(Number(e.target.value) || 30)}
                />
              </label>
            )}
            <div className="flex items-end sm:col-span-2">
              <button
                type="button"
                disabled={pending}
                onClick={create}
                className="inline-flex items-center gap-1.5 rounded-pill bg-ink px-4 py-2 text-caption font-semibold text-white disabled:opacity-45"
              >
                <Plus className="h-3.5 w-3.5" />
                Crear enlace
              </button>
            </div>
          </div>
        )}

        {sorted.length > 0 && (
          <ul className="divide-y divide-surface-line rounded-2xl border border-surface-line bg-white">
            {sorted.map(link => {
              const url = salonSlug
                ? bookingPageUrl(origin, salonSlug, { linkKey: link.link_key })
                : '';
              return (
                <li key={link.id} className="space-y-2 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-label font-bold text-ink">
                        {link.label || link.custom_title || link.link_key}
                      </p>
                      <p className="text-caption text-ink-2">
                        {MODE_LABEL[link.payment_mode]}
                        {link.payment_mode === 'pay_deposit'
                          ? ` · ${Math.round(link.deposit_bps / 100)}%`
                          : ''}
                        {!link.active ? ' · pausado' : ''}
                      </p>
                      {url && (
                        <p className="mt-1 break-all font-mono text-[11px] text-ink-3">{url}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void copyUrl(link)}
                        className="inline-flex items-center gap-1 rounded-pill border border-surface-line px-3 py-1.5 text-caption font-semibold"
                      >
                        {copied === link.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        Copiar
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => remove(link.id)}
                        className="inline-flex items-center gap-1 rounded-pill border border-surface-line px-3 py-1.5 text-caption font-semibold text-danger-fg"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Borrar
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AjustesSection>
  );
}
