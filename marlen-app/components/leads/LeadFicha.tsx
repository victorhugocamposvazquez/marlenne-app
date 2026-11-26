'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, MessageCircle, Phone } from 'lucide-react';
import {
  addLeadNote,
  clearLeadChannel,
  convertLeadToClient,
  markLeadChannel,
  saveLeadTemplate,
  setLeadTags,
  type LeadEventRow,
  type LeadRow,
} from '@/app/actions/leads';
import { goWhatsApp } from '@/hooks/open-whatsapp';
import { renderLeadTemplate, resolveLeadTemplate } from '@/lib/leads';
import { waHref } from '@/lib/phone';
import MetaLogo from '@/components/leads/MetaLogo';

const KIND: Record<LeadEventRow['kind'], string> = {
  call: 'Llamada',
  whatsapp: 'WhatsApp',
  note: 'Nota',
  tag: 'Etiquetas',
  convert: 'Clienta',
  undo: 'Color',
};

export default function LeadFicha({
  lead,
  events,
  templates,
  salonName,
  knownTags = [],
}: {
  lead: LeadRow;
  events: LeadEventRow[];
  templates: { ad: string | null; campaign: string | null; salon: string | null };
  salonName: string;
  knownTags?: string[];
}) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [tag, setTag] = useState('');
  const [adTemplate, setAdTemplate] = useState(templates.ad ?? '');
  const [campaignTemplate, setCampaignTemplate] = useState(templates.campaign ?? '');
  const [error, setError] = useState<string | null>(null);
  const [adLightbox, setAdLightbox] = useState(false);
  const [pending, start] = useTransition();

  const resolved = resolveLeadTemplate(templates);
  const message = renderLeadTemplate(resolved.body, {
    nombre: lead.full_name,
    campana: lead.campaign_name,
    anuncio: lead.ad_name || lead.ad_headline,
    centro: salonName,
  });
  const wa = lead.phone ? waHref(lead.phone, message) : null;
  const from = [lead.campaign_name, lead.ad_name].filter(Boolean).join(' · ');
  const fromMeta = Boolean(lead.meta_lead_id?.trim())
    || Boolean(lead.ad_id?.trim() && lead.form_fields.length > 0);
  const adTitle = lead.ad_headline || lead.ad_name || from || 'Anuncio';
  const showAdPreview = Boolean(lead.thumbnail_url || lead.ad_headline || lead.ad_name || from);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? 'No se ha podido guardar');
      else router.refresh();
    });
  };

  return (
    <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 pb-fab pt-5">
      <Link
        href="/leads"
        className="mb-3 inline-flex min-h-[44px] items-center gap-1.5 text-headline font-bold tracking-[-.02em] text-ink no-underline"
      >
        <ChevronLeft size={22} strokeWidth={2.4} aria-hidden />
        <span>Leads</span>
        {fromMeta && <MetaLogo size={20} />}
      </Link>
      <h1 className="text-title font-bold tracking-[-.03em] text-ink">{lead.full_name}</h1>
      <p className="mt-1 text-body text-ink-2">{lead.phone || 'Sin teléfono'}{lead.email ? ` · ${lead.email}` : ''}</p>
      <p className="mt-1 text-label text-ink-3">
        Entró {new Date(lead.created_at).toLocaleString('es-ES', {
          timeZone: 'Europe/Madrid',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
      {from && <p className="mt-1 text-label font-semibold text-ink-2">{from}</p>}

      {showAdPreview && (
        <div className="mt-4 overflow-hidden rounded-row bg-surface-soft p-2">
          <div className="flex min-h-[100px] gap-2">
            {lead.thumbnail_url ? (
              <button
                type="button"
                onClick={() => setAdLightbox(true)}
                className="w-[70%] shrink-0 overflow-hidden rounded-field text-left"
                aria-label="Ver creatividad en grande"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lead.thumbnail_url}
                  alt=""
                  className="aspect-[4/5] w-full object-cover"
                />
              </button>
            ) : null}
            <div
              className={`flex min-w-0 flex-col justify-center py-1 pr-1 ${lead.thumbnail_url ? 'w-[30%]' : 'w-full'}`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-ink-3">Anuncio</p>
              <p className="mt-1 line-clamp-6 text-label font-bold leading-snug text-ink">{adTitle}</p>
            </div>
          </div>
        </div>
      )}

      {adLightbox && lead.thumbnail_url && (
        <button
          type="button"
          aria-label="Cerrar imagen"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/70 p-6 backdrop-blur-sm"
          onClick={() => setAdLightbox(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lead.thumbnail_url}
            alt=""
            className="max-h-[min(88dvh,900px)] max-w-full rounded-field object-contain shadow-lg"
            onClick={e => e.stopPropagation()}
          />
        </button>
      )}

      {lead.form_fields.length > 0 && (
        <section className="mt-5" aria-labelledby="lead-form-heading">
          <h2 id="lead-form-heading" className="text-body font-bold text-ink">Formulario</h2>
          <dl className="mt-2 overflow-hidden rounded-row bg-surface-soft px-4">
            {lead.form_fields.map(row => (
              <div key={row.key} className="flex gap-3 border-b border-white/60 py-3 last:border-0">
                <dt className="w-[40%] shrink-0 text-label font-semibold text-ink-2">{row.label}</dt>
                <dd className="min-w-0 flex-1 text-label font-medium text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {lead.phone && (
          <a href={`tel:${lead.phone}`} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-pill bg-[#E8F2FF] px-4 text-label font-bold text-[#0879FF] no-underline">
            <Phone size={16} strokeWidth={2.4} />
            Llamar
          </a>
        )}
        {wa && (
          <button
            type="button"
            onClick={() => goWhatsApp(wa)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-pill bg-[#E7F8EE] px-4 text-label font-bold text-[#15803D]"
          >
            <MessageCircle size={16} strokeWidth={2.4} />
            WhatsApp
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => markLeadChannel(lead.id, 'call'))}
          className="inline-flex min-h-[44px] items-center rounded-pill bg-surface-soft px-4 text-label font-bold"
        >
          He llamado
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => markLeadChannel(lead.id, 'whatsapp'))}
          className="inline-flex min-h-[44px] items-center rounded-pill bg-surface-soft px-4 text-label font-bold"
        >
          He escrito
        </button>
        {lead.last_channel && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => clearLeadChannel(lead.id))}
            className="inline-flex min-h-[44px] items-center rounded-pill bg-surface-soft px-4 text-label font-bold text-ink-2"
          >
            Deshacer
          </button>
        )}
      </div>
      <p className="mt-2 text-label text-ink-3">
        El color del listado cambia al marcar el contacto, no al abrir la llamada.
      </p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {lead.tags.map(item => (
          <button
            key={item}
            type="button"
            onClick={() => run(() => setLeadTags(lead.id, lead.tags.filter(t => t !== item)))}
            className="rounded-pill bg-surface-soft px-3 py-1.5 text-label font-bold"
          >
            {item} ×
          </button>
        ))}
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={e => {
          e.preventDefault();
          const next = tag.trim();
          if (!next) return;
          run(async () => {
            const res = await setLeadTags(lead.id, [...lead.tags, next]);
            if (res.ok) setTag('');
            return res;
          });
        }}
      >
        <input
          value={tag}
          onChange={e => setTag(e.target.value)}
          placeholder="Etiqueta"
          aria-label="Nueva etiqueta"
          className="min-w-0 flex-1 rounded-field bg-surface-soft px-4 py-3 text-[16px] outline-none"
        />
        <button type="submit" className="rounded-pill bg-ink px-4 text-label font-bold text-white">Añadir</button>
      </form>
      {knownTags.filter(item => !lead.tags.includes(item)).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {knownTags.filter(item => !lead.tags.includes(item)).map(item => (
            <button
              key={item}
              type="button"
              onClick={() => run(() => setLeadTags(lead.id, [...lead.tags, item]))}
              className="rounded-pill border border-surface-line px-3 py-1.5 text-label font-bold text-ink-2"
            >
              {item}
            </button>
          ))}
        </div>
      )}

      <form
        className="mt-4"
        onSubmit={e => {
          e.preventDefault();
          run(async () => {
            const res = await addLeadNote(lead.id, note);
            if (res.ok) setNote('');
            return res;
          });
        }}
      >
        <label className="text-label font-bold text-ink-2" htmlFor="lead-note">Anotación</label>
        <textarea
          id="lead-note"
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-field bg-surface-soft px-4 py-3 text-[16px] outline-none"
        />
        <button type="submit" disabled={pending} className="mt-2 min-h-[44px] rounded-pill bg-ink px-4 text-label font-bold text-white">
          Guardar nota
        </button>
      </form>

      {lead.ad_id && (
        <TemplateField
          label="WhatsApp de este anuncio"
          value={adTemplate}
          onChange={setAdTemplate}
          onSave={() => run(() => saveLeadTemplate({ scope: 'ad', adId: lead.ad_id, body: adTemplate }))}
        />
      )}
      {lead.campaign_id && (
        <TemplateField
          label="WhatsApp de esta campaña"
          value={campaignTemplate}
          onChange={setCampaignTemplate}
          onSave={() => run(() => saveLeadTemplate({ scope: 'campaign', campaignId: lead.campaign_id, body: campaignTemplate }))}
        />
      )}

      {!lead.client_id ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => convertLeadToClient(lead.id))}
          className="mt-5 min-h-[48px] w-full rounded-pill bg-grad text-[16px] font-bold text-white"
        >
          Pasar a clienta
        </button>
      ) : (
        <Link href={`/clientas/${lead.client_id}`} className="mt-5 flex min-h-[48px] items-center justify-center rounded-pill bg-surface-soft text-body font-bold text-ink no-underline">
          Ver ficha de clienta
        </Link>
      )}

      {error && <p className="mt-3 text-label font-semibold text-danger-fg">{error}</p>}

      <h2 className="mb-2 mt-6 text-body font-bold">Histórico</h2>
      {events.length === 0 && <p className="text-label text-ink-3">Todavía no hay acciones.</p>}
      <ul className="flex flex-col gap-2">
        {events.map(event => (
          <li key={event.id} className="rounded-row bg-surface-soft px-4 py-3">
            <p className="text-label font-bold">{KIND[event.kind]}</p>
            {event.body && <p className="mt-0.5 text-label text-ink">{event.body}</p>}
            <p className="mt-1 text-[12px] text-ink-3">
              {new Date(event.created_at).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {event.staff_name ? ` · ${event.staff_name}` : ''}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TemplateField({
  label, value, onChange, onSave,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <form className="mt-4" onSubmit={e => { e.preventDefault(); onSave(); }}>
      <label className="text-label font-bold text-ink-2">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        className="mt-1 w-full rounded-field bg-surface-soft px-4 py-3 text-[16px] outline-none"
      />
      <button type="submit" className="mt-2 min-h-[44px] rounded-pill bg-ink px-4 text-label font-bold text-white">
        Guardar plantilla
      </button>
    </form>
  );
}
