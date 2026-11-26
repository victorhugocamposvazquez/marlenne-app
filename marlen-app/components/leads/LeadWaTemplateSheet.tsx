'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, MessageCircle, X } from 'lucide-react';
import { DEFAULT_LEAD_WA, renderLeadTemplate, resolveLeadTemplate } from '@/lib/leads';
import { waHref } from '@/lib/phone';
import { goWhatsApp } from '@/hooks/open-whatsapp';

export type WaTemplateScope = 'none' | 'ad' | 'campaign' | 'salon';

export default function LeadWaTemplateSheet({
  open,
  onClose,
  phone,
  fullName,
  campaignName,
  adName,
  salonName,
  templates,
  onOpenWhatsApp,
}: {
  open: boolean;
  onClose: () => void;
  phone: string;
  fullName: string;
  campaignName: string | null;
  adName: string | null;
  salonName: string;
  templates: { ad: string | null; campaign: string | null; salon: string | null };
  onOpenWhatsApp?: () => void;
}) {
  const resolved = useMemo(() => resolveLeadTemplate(templates), [templates]);
  const [scope, setScope] = useState<WaTemplateScope>(resolved.scope);
  const [draft, setDraft] = useState('');
  const [editingMsg, setEditingMsg] = useState(false);

  const vars = useMemo(
    () => ({
      nombre: fullName,
      campana: campaignName,
      anuncio: adName,
      centro: salonName,
    }),
    [fullName, campaignName, adName, salonName],
  );

  useEffect(() => {
    if (open) {
      setScope(resolved.scope);
      setEditingMsg(false);
    }
  }, [open, resolved.scope]);

  useEffect(() => {
    if (!open) return;
    setEditingMsg(false);
    if (scope === 'none') {
      setDraft('');
      return;
    }
    const body = scope === 'ad'
      ? templates.ad?.trim() ?? ''
      : scope === 'campaign'
        ? templates.campaign?.trim() ?? ''
        : templates.salon?.trim() || DEFAULT_LEAD_WA;
    setDraft(renderLeadTemplate(body, vars));
  }, [open, scope, templates, vars]);

  const options = useMemo(() => {
    const rows: { scope: WaTemplateScope; label: string }[] = [
      { scope: 'none', label: 'Sin plantilla' },
    ];
    if (templates.ad?.trim()) {
      rows.push({ scope: 'ad', label: 'Plantilla del anuncio' });
    }
    if (templates.campaign?.trim()) {
      rows.push({ scope: 'campaign', label: 'Plantilla de la campaña' });
    }
    rows.push({ scope: 'salon', label: 'Plantilla del centro' });
  return rows;
  }, [templates]);

  if (!open) return null;

  const send = () => {
    const text = scope === 'none' ? undefined : draft.trim();
    const href = waHref(phone, text || undefined);
    if (!href) return;
    onOpenWhatsApp?.();
    goWhatsApp(href);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col justify-end bg-ink/45"
      role="dialog"
      aria-modal
      aria-labelledby="lead-wa-sheet-title"
      onClick={onClose}
    >
      <div
        className="max-h-[min(78dvh,520px)] overflow-y-auto rounded-t-[24px] bg-surface-card px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-lift"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id="lead-wa-sheet-title" className="text-body font-bold text-ink">
              Mensaje de WhatsApp
            </h2>
            <p className="mt-0.5 text-label text-ink-3">Elige plantilla o abre el chat vacío.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-ink"
            aria-label="Cerrar"
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        <ul className="flex flex-col gap-1">
          {options.map(opt => {
            const on = scope === opt.scope;
            return (
              <li key={opt.scope}>
                <button
                  type="button"
                  onClick={() => setScope(opt.scope)}
                  className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-field px-3 text-left text-label ${
                    on ? 'bg-surface-soft font-bold text-ink' : 'font-medium text-ink-2'
                  }`}
                >
                  {opt.label}
                  {on && <Check size={16} strokeWidth={2.4} className="shrink-0" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>

        {scope !== 'none' && (
          <div className="mt-3">
            {editingMsg ? (
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={5}
                autoFocus
                aria-label="Mensaje de WhatsApp"
                className="w-full rounded-field bg-surface-soft px-3 py-3 text-label leading-snug text-ink outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingMsg(true)}
                className="w-full rounded-field bg-surface-soft p-3 text-left"
              >
                <p className="whitespace-pre-wrap text-label leading-snug text-ink">{draft}</p>
                <p className="mt-2 text-[12px] font-semibold text-ink-3">Toca para editar el mensaje</p>
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={send}
          className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-pill bg-[#15803D] text-[16px] font-bold text-white"
        >
          <MessageCircle size={18} strokeWidth={2.4} aria-hidden />
          Abrir WhatsApp
        </button>
      </div>
    </div>
  );
}