'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, RotateCcw, Sparkles } from 'lucide-react';
import { saveBookingTheme } from '@/app/actions/booking-theme';
import AjustesSection from '@/components/ajustes/AjustesSection';
import { useToast } from '@/components/Toast';
import {
  BOOKING_DEFAULT_ACCENT,
  BOOKING_PRESET_ACCENTS,
  buildLogoPalette,
  extractColorsFromImage,
  normalizeBookingHex,
  resolveBookingTheme,
} from '@/lib/booking/theme';

export default function BookingAppearanceCard({
  logoUrl,
  initialAccent,
}: {
  logoUrl: string | null;
  initialAccent: string | null;
}) {
  const toast = useToast();
  const router = useRouter();
  const [accent, setAccent] = useState(
    normalizeBookingHex(initialAccent) ?? BOOKING_DEFAULT_ACCENT,
  );
  const [logoChips, setLogoChips] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);

  const theme = resolveBookingTheme({ accent });
  const saved = normalizeBookingHex(initialAccent) ?? BOOKING_DEFAULT_ACCENT;

  useEffect(() => {
    if (!logoUrl) {
      setLogoChips([]);
      return;
    }
    let cancelled = false;
    setExtracting(true);
    extractColorsFromImage(logoUrl)
      .then(colors => {
        if (!cancelled) setLogoChips(buildLogoPalette(colors));
      })
      .catch(() => {
        if (!cancelled) setLogoChips([]);
      })
      .finally(() => {
        if (!cancelled) setExtracting(false);
      });
    return () => { cancelled = true; };
  }, [logoUrl]);

  function pick(hex: string) {
    const n = normalizeBookingHex(hex);
    if (!n) return;
    setAccent(n);
    setDirty(true);
  }

  function reset() {
    setAccent(BOOKING_DEFAULT_ACCENT);
    setDirty(true);
  }

  function save() {
    startTransition(async () => {
      const r = await saveBookingTheme({
        accent: accent === BOOKING_DEFAULT_ACCENT ? null : accent,
      });
      if (!r.ok) {
        toast(r.error);
        return;
      }
      setDirty(false);
      toast('Colores del widget guardados');
      router.refresh();
    });
  }

  return (
    <AjustesSection title="Apariencia" className="mt-0">
      <div className="space-y-4 py-4">
        <p className="text-body leading-snug text-ink-2">
          Color del calendario y de los enlaces de un servicio. Si hay logo, sugerimos tonos a partir de él.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2">
            <span className="text-caption font-semibold text-ink-2">Principal</span>
            <input
              type="color"
              value={accent}
              onChange={e => pick(e.target.value)}
              className="h-10 w-12 cursor-pointer rounded-field border border-surface-line bg-white p-1"
              aria-label="Color principal"
            />
          </label>
          <input
            value={accent}
            onChange={e => {
              const v = e.target.value;
              setAccent(v);
              if (normalizeBookingHex(v)) setDirty(true);
            }}
            onBlur={() => {
              const n = normalizeBookingHex(accent);
              if (n) setAccent(n);
            }}
            spellCheck={false}
            className="w-[7.5rem] rounded-field border border-surface-line bg-white px-3 py-2 font-mono text-label outline-none ring-v focus:ring-2"
            aria-label="Hex del color"
          />
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-pill border border-surface-line px-3 py-1.5 text-caption font-semibold text-ink"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restablecer
          </button>
        </div>

        <div>
          <p className="text-caption font-semibold text-ink-2">Presets</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {BOOKING_PRESET_ACCENTS.map(c => (
              <ColorChip key={c} hex={c} active={accent === c} onClick={() => pick(c)} />
            ))}
          </div>
        </div>

        {logoUrl && (
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
                No se han podido sacar colores claros del logo.
              </p>
            ) : null}
          </div>
        )}

        <div className="rounded-2xl border border-surface-line bg-white p-4">
          <p className="text-caption font-semibold text-ink-3">Vista rápida</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-bold text-white"
              style={{ background: theme.accent }}
            >
              12
            </span>
            <button
              type="button"
              className="h-10 rounded-md px-4 text-[13px] font-bold text-white"
              style={{ background: theme.accent }}
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pending || !dirty}
            onClick={save}
            className="inline-flex items-center gap-1.5 rounded-pill bg-ink px-4 py-2 text-caption font-semibold text-white disabled:opacity-40"
          >
            {pending ? 'Guardando…' : (
              <>
                <Check className="h-3.5 w-3.5" />
                Guardar colores
              </>
            )}
          </button>
          {!dirty && accent === saved && (
            <span className="text-caption text-ink-3">Sin cambios pendientes</span>
          )}
        </div>
      </div>
    </AjustesSection>
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
