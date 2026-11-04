'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Download } from 'lucide-react';
import { saveMarketingCreative } from '@/app/actions/marketing';
import StylePicker from '@/components/marketing/StylePicker';
import CreativeCanvas from '@/components/marketing/CreativeCanvas';
import { useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase/client';
import { defaultsForKind, kindNeedsItem } from '@/lib/marketing/defaults';
import { exportCreativePng } from '@/lib/marketing/draw';
import { FORMAT_SIZES, KIND_META } from '@/lib/marketing/styles';
import {
  MARKETING_FORMATS,
  MARKETING_KINDS,
  type CreativePayload,
  type MarketingBrand,
  type MarketingFormat,
  type MarketingKind,
  type MarketingStyleId,
} from '@/lib/marketing/types';
import type { PackTemplate, Provider, ServiceOption } from '@/lib/types';

type Step = 'kind' | 'style' | 'item' | 'format' | 'texts' | 'preview';

const fieldCls =
  'mt-1.5 w-full rounded-field border border-surface-line bg-white px-3 py-2.5 text-body outline-none ring-v focus:ring-2';

const STEPS: Step[] = ['kind', 'style', 'item', 'format', 'texts', 'preview'];

function stepsFor(kind: MarketingKind | null): Step[] {
  if (!kind) return ['kind'];
  if (kindNeedsItem(kind) === 'none') {
    return ['kind', 'style', 'format', 'texts', 'preview'];
  }
  return STEPS;
}

export default function CreativeWizard({
  salonId,
  brand,
  packs,
  services,
  staff,
  onCancel,
}: {
  salonId: string;
  brand: MarketingBrand;
  packs: PackTemplate[];
  services: ServiceOption[];
  staff: Provider[];
  onCancel: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [step, setStep] = useState<Step>('kind');
  const [kind, setKind] = useState<MarketingKind | null>(null);
  const [styleId, setStyleId] = useState<MarketingStyleId | null>(null);
  const [format, setFormat] = useState<MarketingFormat>('story_9_16');
  const [packId, setPackId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [payload, setPayload] = useState<CreativePayload | null>(null);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [saving, setSaving] = useState(false);

  const pack = useMemo(() => packs.find(p => p.id === packId) ?? null, [packs, packId]);
  const service = useMemo(
    () => services.find(s => s.id === serviceId) ?? null,
    [services, serviceId],
  );
  const member = useMemo(() => staff.find(s => s.id === staffId) ?? null, [staff, staffId]);

  const flow = stepsFor(kind);
  const stepIdx = flow.indexOf(step);

  useEffect(() => {
    if (!brand.logoUrl) {
      setLogo(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setLogo(img);
    img.onerror = () => setLogo(null);
    img.src = brand.logoUrl;
  }, [brand.logoUrl]);

  const rebuildPayload = (k: MarketingKind) => {
    setPayload(
      defaultsForKind(k, brand, {
        pack,
        service,
        staff: member,
      }),
    );
  };

  const goNext = () => {
    if (!kind) return;
    const f = stepsFor(kind);
    const i = f.indexOf(step);
    if (i < 0 || i >= f.length - 1) return;
    const nxt = f[i + 1]!;
    if (nxt === 'texts' || (nxt === 'preview' && !payload)) {
      rebuildPayload(kind);
    }
    setStep(nxt);
  };

  const goBack = () => {
    if (!kind || step === 'kind') {
      onCancel();
      return;
    }
    const f = stepsFor(kind);
    const i = f.indexOf(step);
    if (i <= 0) {
      onCancel();
      return;
    }
    setStep(f[i - 1]!);
  };

  const canAdvance = (): boolean => {
    if (step === 'kind') return !!kind;
    if (step === 'style') return !!styleId;
    if (step === 'item' && kind) {
      const needs = kindNeedsItem(kind);
      if (needs === 'pack') return !!packId;
      if (needs === 'service') return !!serviceId;
      if (needs === 'staff') return !!staffId;
    }
    if (step === 'format') return !!format;
    if (step === 'texts') return !!(payload?.headline?.trim());
    return true;
  };

  const downloadAndSave = async () => {
    if (!kind || !styleId || !payload) return;
    setSaving(true);
    try {
      const blob = await exportCreativePng({
        styleId,
        format,
        brand,
        payload,
        logo,
      });
      const id = crypto.randomUUID();
      const path = `${salonId}/${id}.png`;
      const sb = createClient();
      const { error: upErr } = await sb.storage.from('marketing-creatives').upload(path, blob, {
        contentType: 'image/png',
        upsert: false,
        cacheControl: '3600',
      });
      if (upErr) {
        toast(
          /Bucket not found|not found|row-level/i.test(upErr.message)
            ? 'Falta aplicar la migración de marketing'
            : upErr.message,
          'err',
        );
        return;
      }

      const r = await saveMarketingCreative({
        kind,
        styleId,
        format,
        payload,
        imagePath: path,
      });
      if (!r.ok) {
        toast(r.error, 'err');
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `marlen-${kind}-${format}.png`;
      a.click();
      URL.revokeObjectURL(url);

      if (payload.ctaUrl) {
        try {
          await navigator.clipboard.writeText(payload.ctaUrl);
          toast('PNG listo · enlace de reserva copiado');
        } catch {
          toast('Creatividad guardada y descargada');
        }
      } else {
        toast('Creatividad guardada y descargada');
      }
      router.refresh();
      onCancel();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo exportar', 'err');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={goBack}
          className="grid h-10 w-10 place-items-center rounded-pill bg-track text-ink"
          aria-label="Atrás"
        >
          <ArrowLeft size={18} strokeWidth={2.4} aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-body-lg font-bold text-ink">Nueva creatividad</div>
          <div className="text-caption text-ink-2">
            Paso {Math.max(1, stepIdx + 1)} de {flow.length}
          </div>
        </div>
      </div>

      {step === 'kind' && (
        <div className="grid gap-2">
          {MARKETING_KINDS.map(k => {
            const meta = KIND_META[k];
            const on = kind === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k);
                  setPackId(null);
                  setServiceId(null);
                  setStaffId(null);
                  setPayload(null);
                }}
                className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-left ${
                  on ? 'border-ink ring-2 ring-ink/15' : 'border-surface-line'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-bold text-ink">{meta.label}</span>
                  <span className="mt-0.5 block text-caption text-ink-2">{meta.hint}</span>
                </span>
                {on && <Check size={18} className="mt-0.5 shrink-0 text-ink" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}

      {step === 'style' && (
        <StylePicker
          value={styleId}
          onChange={id => setStyleId(id)}
        />
      )}

      {step === 'item' && kind && kindNeedsItem(kind) === 'pack' && (
        <div className="grid gap-2">
          {packs.length === 0 ? (
            <p className="text-body text-ink-2">No hay plantillas de bono activas.</p>
          ) : (
            packs.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPackId(p.id)}
                className={`rounded-2xl border px-4 py-3 text-left ${
                  packId === p.id ? 'border-ink ring-2 ring-ink/15' : 'border-surface-line'
                }`}
              >
                <div className="text-body font-bold text-ink">{p.name}</div>
                <div className="text-caption text-ink-2">
                  {p.sessions_total} sesiones
                  {p.service_name ? ` · ${p.service_name}` : ''}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {step === 'item' && kind && kindNeedsItem(kind) === 'service' && (
        <div className="grid max-h-[50vh] gap-2 overflow-y-auto">
          {services.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setServiceId(s.id)}
              className={`rounded-2xl border px-4 py-3 text-left ${
                serviceId === s.id ? 'border-ink ring-2 ring-ink/15' : 'border-surface-line'
              }`}
            >
              <div className="text-body font-bold text-ink">{s.name}</div>
              <div className="text-caption text-ink-2">{s.duration_min} min</div>
            </button>
          ))}
        </div>
      )}

      {step === 'item' && kind && kindNeedsItem(kind) === 'staff' && (
        <div className="grid gap-2">
          {staff.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStaffId(s.id)}
              className={`rounded-2xl border px-4 py-3 text-left ${
                staffId === s.id ? 'border-ink ring-2 ring-ink/15' : 'border-surface-line'
              }`}
            >
              <div className="text-body font-bold text-ink">{s.full_name}</div>
              <div className="text-caption text-ink-2">{s.job_title ?? s.role}</div>
            </button>
          ))}
        </div>
      )}

      {step === 'format' && (
        <div className="grid gap-2">
          {MARKETING_FORMATS.map(f => {
            const meta = FORMAT_SIZES[f];
            const on = format === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left ${
                  on ? 'border-ink ring-2 ring-ink/15' : 'border-surface-line'
                }`}
              >
                <span
                  className="shrink-0 rounded-md border border-surface-line bg-track"
                  style={{
                    width: 28,
                    height: Math.round(28 * (meta.h / meta.w)),
                  }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-bold text-ink">{meta.label}</span>
                  <span className="text-caption text-ink-2">
                    {meta.w}×{meta.h} px
                  </span>
                </span>
                {on && <Check size={18} className="shrink-0 text-ink" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}

      {step === 'texts' && payload && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-caption font-semibold text-ink-2">Antetítulo</span>
            <input
              className={fieldCls}
              value={payload.kicker ?? ''}
              maxLength={60}
              onChange={e => setPayload({ ...payload, kicker: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-caption font-semibold text-ink-2">Titular</span>
            <input
              className={fieldCls}
              value={payload.headline}
              maxLength={80}
              onChange={e => setPayload({ ...payload, headline: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-caption font-semibold text-ink-2">Subtítulo</span>
            <input
              className={fieldCls}
              value={payload.subline}
              maxLength={120}
              onChange={e => setPayload({ ...payload, subline: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-caption font-semibold text-ink-2">Precio (opcional)</span>
            <input
              className={fieldCls}
              value={payload.priceLabel}
              maxLength={40}
              onChange={e => setPayload({ ...payload, priceLabel: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-caption font-semibold text-ink-2">Botón</span>
            <input
              className={fieldCls}
              value={payload.ctaLabel}
              maxLength={40}
              onChange={e => setPayload({ ...payload, ctaLabel: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-caption font-semibold text-ink-2">Enlace de reserva</span>
            <input
              className={fieldCls}
              value={payload.ctaUrl}
              maxLength={500}
              onChange={e => setPayload({ ...payload, ctaUrl: e.target.value })}
            />
          </label>
        </div>
      )}

      {step === 'preview' && kind && styleId && payload && (
        <div className="space-y-4">
          <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-2xl border border-surface-line shadow-sm">
            <CreativeCanvas
              styleId={styleId}
              format={format}
              brand={brand}
              payload={payload}
              logo={logo}
              className="block w-full"
            />
          </div>
          <p className="text-center text-caption text-ink-2">
            Se descarga el PNG y se guarda en la biblioteca. El enlace de reserva se copia al portapapeles.
          </p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {step !== 'preview' ? (
          <button
            type="button"
            disabled={!canAdvance()}
            onClick={() => {
              if (step === 'item' && kind) rebuildPayload(kind);
              if (step === 'texts' && kind) {
                setPayload(p =>
                  p
                    ? {
                        ...p,
                        packTemplateId: pack?.id ?? p.packTemplateId,
                        serviceId: service?.id ?? pack?.service_id ?? p.serviceId,
                        staffId: member?.id ?? p.staffId,
                      }
                    : p,
                );
              }
              goNext();
            }}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-pill bg-ink px-4 text-body font-semibold text-white disabled:opacity-40"
          >
            Continuar
          </button>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={() => void downloadAndSave()}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-pill bg-ink px-4 text-body font-semibold text-white disabled:opacity-40"
          >
            <Download size={18} strokeWidth={2.2} aria-hidden />
            {saving ? 'Guardando…' : 'Descargar y guardar'}
          </button>
        )}
      </div>
    </div>
  );
}
