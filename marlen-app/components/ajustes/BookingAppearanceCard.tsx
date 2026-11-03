'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ImagePlus, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { saveBookingTheme } from '@/app/actions/booking-theme';
import { saveSalonLogoPath } from '@/app/actions/salon-branding';
import AjustesSection from '@/components/ajustes/AjustesSection';
import { useToast } from '@/components/Toast';
import { compressImage } from '@/hooks/compressImage';
import {
  BOOKING_DEFAULT_ACCENT,
  BOOKING_PRESET_ACCENTS,
  buildLogoPalette,
  extractColorsFromImage,
  normalizeBookingHex,
  resolveBookingTheme,
} from '@/lib/booking/theme';
import { createClient } from '@/lib/supabase/client';
import { publicLogoUrl } from '@/lib/salon-branding';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function BookingAppearanceCard({
  salonId,
  logoUrl: initialLogoUrl,
  logoPath: initialLogoPath,
  initialAccent,
}: {
  salonId: string;
  logoUrl: string | null;
  logoPath: string | null;
  initialAccent: string | null;
}) {
  const toast = useToast();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveGen = useRef(0);
  const [accent, setAccent] = useState(
    normalizeBookingHex(initialAccent) ?? BOOKING_DEFAULT_ACCENT,
  );
  const [savedAccent, setSavedAccent] = useState(
    normalizeBookingHex(initialAccent) ?? BOOKING_DEFAULT_ACCENT,
  );
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [logoPath, setLogoPath] = useState(initialLogoPath);
  const [logoChips, setLogoChips] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const hasLogo = !!logoUrl;
  const theme = resolveBookingTheme({ accent });
  const busy = pending || uploading;

  useEffect(() => {
    const next = normalizeBookingHex(initialAccent) ?? BOOKING_DEFAULT_ACCENT;
    setSavedAccent(next);
    setAccent(prev => (saveStatus === 'saving' ? prev : next));
  }, [initialAccent]); // eslint-disable-line react-hooks/exhaustive-deps -- no re-sync mid-save

  useEffect(() => {
    setLogoPath(initialLogoPath);
    setLogoUrl(prev => {
      if (!initialLogoUrl) return null;
      if (prev && prev.split('?')[0] === initialLogoUrl.split('?')[0] && prev.includes('?t=')) {
        return prev;
      }
      return initialLogoUrl;
    });
  }, [initialLogoUrl, initialLogoPath]);

  useEffect(() => {
    if (!logoUrl) {
      setLogoChips([]);
      setExtracting(false);
      return;
    }
    let cancelled = false;
    setExtracting(true);
    extractColorsFromImage(logoUrl)
      .then(colors => {
        if (cancelled) return;
        const next = buildLogoPalette(colors);
        if (next.length) setLogoChips(next);
      })
      .catch(() => {
        /* conservar chips previos */
      })
      .finally(() => {
        if (!cancelled) setExtracting(false);
      });
    return () => { cancelled = true; };
  }, [logoUrl]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  function persistAccent(hex: string) {
    const n = normalizeBookingHex(hex);
    if (!n) return;
    if (n === savedAccent && saveStatus !== 'error') {
      setSaveStatus('saved');
      return;
    }

    const gen = ++saveGen.current;
    setSaveStatus('saving');
    startTransition(async () => {
      const r = await saveBookingTheme({
        accent: n === BOOKING_DEFAULT_ACCENT ? null : n,
      });
      if (gen !== saveGen.current) return;
      if (!r.ok) {
        setSaveStatus('error');
        toast(r.error);
        return;
      }
      setSavedAccent(n);
      setSaveStatus('saved');
      router.refresh();
    });
  }

  function pick(hex: string, opts?: { debounce?: boolean }) {
    const n = normalizeBookingHex(hex);
    if (!n) return;
    setAccent(n);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (opts?.debounce) {
      setSaveStatus('saving');
      debounceRef.current = setTimeout(() => persistAccent(n), 450);
      return;
    }
    persistAccent(n);
  }

  function reset() {
    pick(BOOKING_DEFAULT_ACCENT);
  }

  async function onPickLogo(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setLogoChips([]);
    try {
      const blob = await compressImage(file);
      const path = `${salonId}/logo-${Date.now()}.jpg`;
      const sb = createClient();
      const { error: upErr } = await sb.storage.from('salon-branding').upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: '3600',
      });
      if (upErr) {
        toast(
          /Bucket not found|not found/i.test(upErr.message)
            ? 'Falta aplicar la migración de datos del centro'
            : upErr.message,
        );
        return;
      }
      const r = await saveSalonLogoPath(path);
      if (!r.ok) {
        toast(r.error);
        return;
      }
      if (logoPath && logoPath !== path) {
        void sb.storage.from('salon-branding').remove([logoPath]);
      }

      const localUrl = URL.createObjectURL(blob);
      try {
        const colors = await extractColorsFromImage(localUrl);
        setLogoChips(buildLogoPalette(colors));
      } catch {
        /* el efecto de logoUrl reintentará con la URL pública */
      } finally {
        URL.revokeObjectURL(localUrl);
      }

      const url = publicLogoUrl(path);
      setLogoPath(path);
      setLogoUrl(url ? `${url}?t=${Date.now()}` : null);
      toast('Logotipo actualizado');
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo subir el logo');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function removeLogo() {
    startTransition(async () => {
      if (logoPath) {
        const sb = createClient();
        await sb.storage.from('salon-branding').remove([logoPath]);
      }
      const r = await saveSalonLogoPath(null);
      if (!r.ok) {
        toast(r.error);
        return;
      }
      setLogoPath(null);
      setLogoUrl(null);
      setLogoChips([]);
      toast('Logotipo quitado');
      router.refresh();
    });
  }

  return (
    <AjustesSection title="Apariencia" className="mt-0">
      <div className="space-y-4 py-4">
        <p className="text-body leading-snug text-ink-2">
          Color del calendario y de los enlaces de un servicio. Se guarda al elegir un color.
          {hasLogo
            ? ' Con el logo del centro, sugerimos tonos a partir de él.'
            : ' Sube el logo del centro para sugerir colores automáticamente.'}
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white ring-1 ring-surface-line">
            {hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl!} alt="" className="h-full w-full object-contain" />
            ) : (
              <ImagePlus size={20} className="text-ink-3" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-caption font-semibold text-ink">
              {hasLogo ? 'Logo del centro' : 'Sin logo todavía'}
            </p>
            <p className="text-caption leading-snug text-ink-3">
              {hasLogo
                ? 'Aparece en el widget de reservas y sirve para sugerir colores.'
                : 'Puedes subirlo aquí; también se usa en facturas.'}
            </p>
            <div className="flex flex-wrap gap-2 pt-0.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="rounded-pill bg-ink px-3.5 py-1.5 text-caption font-semibold text-white disabled:opacity-45"
              >
                {uploading ? 'Subiendo…' : hasLogo ? 'Cambiar logo' : 'Subir logo'}
              </button>
              {hasLogo && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={removeLogo}
                  className="inline-flex items-center gap-1.5 rounded-pill border border-surface-line px-3.5 py-1.5 text-caption font-semibold text-ink-2 disabled:opacity-45"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Quitar
                </button>
              )}
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={e => void onPickLogo(e.target.files?.[0])}
          />
        </div>

        {hasLogo && (
          <div>
            <p className="inline-flex items-center gap-1.5 text-caption font-semibold text-ink-2">
              <Sparkles className="h-3.5 w-3.5" />
              Del logo
              {extracting && <span className="font-normal text-ink-3"> · extrayendo…</span>}
            </p>
            {logoChips.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {logoChips.map(c => (
                  <ColorChip key={c} hex={c} active={accent === c} onClick={() => pick(c)} />
                ))}
              </div>
            ) : !extracting ? (
              <p className="mt-1 text-caption text-ink-3">
                No se han podido sacar colores del logo. Prueba con JPEG/PNG o elige un preset.
              </p>
            ) : null}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2">
            <span className="text-caption font-semibold text-ink-2">Principal</span>
            <input
              type="color"
              value={normalizeBookingHex(accent) ?? BOOKING_DEFAULT_ACCENT}
              onChange={e => pick(e.target.value, { debounce: true })}
              className="h-10 w-12 cursor-pointer rounded-field border border-surface-line bg-white p-1"
              aria-label="Color principal"
            />
          </label>
          <input
            value={accent}
            onChange={e => {
              const v = e.target.value;
              setAccent(v);
              const n = normalizeBookingHex(v);
              if (n) pick(n, { debounce: true });
            }}
            onBlur={() => {
              const n = normalizeBookingHex(accent);
              if (n) {
                setAccent(n);
                persistAccent(n);
              } else {
                setAccent(savedAccent);
              }
            }}
            spellCheck={false}
            className="w-[7.5rem] rounded-field border border-surface-line bg-white px-3 py-2 font-mono text-label outline-none ring-v focus:ring-2"
            aria-label="Hex del color"
          />
          <button
            type="button"
            onClick={reset}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-pill border border-surface-line px-3 py-1.5 text-caption font-semibold text-ink disabled:opacity-45"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restablecer
          </button>
          <SaveHint status={saveStatus} />
        </div>

        <div>
          <p className="text-caption font-semibold text-ink-2">Presets</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {BOOKING_PRESET_ACCENTS.map(c => (
              <ColorChip key={c} hex={c} active={accent === c} onClick={() => pick(c)} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-surface-line bg-white p-4">
          <p className="text-caption font-semibold text-ink-3">Vista rápida</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-bold"
              style={{ background: theme.accent, color: theme.onAccent }}
            >
              12
            </span>
            <button
              type="button"
              className="h-10 rounded-md px-4 text-[13px] font-bold"
              style={{ background: theme.accent, color: theme.onAccent }}
            >
              10:30
            </button>
            <button
              type="button"
              className="h-10 rounded-md border-2 px-4 text-[13px] font-bold"
              style={{ borderColor: theme.accent, color: theme.accent, background: theme.accentSoft }}
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </AjustesSection>
  );
}

function SaveHint({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  if (status === 'saving') {
    return <span className="text-caption text-ink-3">Guardando…</span>;
  }
  if (status === 'error') {
    return <span className="text-caption font-semibold text-danger-fg">No se pudo guardar</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-caption font-semibold text-ink-2">
      <Check className="h-3.5 w-3.5" aria-hidden />
      Guardado
    </span>
  );
}

function ColorChip({
  hex,
  active,
  onClick,
}: {
  hex: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hex}
      aria-label={`Usar ${hex}`}
      aria-pressed={active}
      className={[
        'h-9 w-9 rounded-full border-2 transition',
        active ? 'border-ink scale-110 shadow-lift' : 'border-white shadow-[0_0_0_1px_rgba(0,0,0,.12)]',
      ].join(' ')}
      style={{ background: hex }}
    />
  );
}
