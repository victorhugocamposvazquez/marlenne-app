'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Trash2 } from 'lucide-react';
import { saveSalonBranding, saveSalonLogoPath } from '@/app/actions/salon-branding';
import AjustesSection from '@/components/ajustes/AjustesSection';
import { useToast } from '@/components/Toast';
import { inputCls } from '@/components/Sheet';
import { compressImage } from '@/hooks/compressImage';
import { createClient } from '@/lib/supabase/client';
import { publicLogoUrl, type SalonBranding } from '@/lib/salon-branding';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block border-b border-surface-line py-4 last:border-0">
      <span className="block text-body-lg font-bold text-ink">{label}</span>
      {hint && <span className="mt-0.5 block text-body leading-snug text-ink-2">{hint}</span>}
      <div className="mt-3">{children}</div>
    </label>
  );
}

export default function CentroBrandingForm({
  initial,
  salonId,
}: {
  initial: SalonBranding;
  salonId: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: initial.name,
    legalName: initial.legalName,
    taxId: initial.taxId,
    fiscalAddress: initial.fiscalAddress,
    phone: initial.phone,
  });
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [logoPath, setLogoPath] = useState(initial.logoPath);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  const set = (key: keyof typeof form, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      const r = await saveSalonBranding(form);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast('Datos del centro guardados');
      router.refresh();
    });
  };

  const onPickLogo = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const blob = await compressImage(file);
      const path = `${salonId}/logo.jpg`;
      const sb = createClient();
      const { error: upErr } = await sb.storage.from('salon-branding').upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });
      if (upErr) {
        setError(
          /Bucket not found|not found/i.test(upErr.message)
            ? 'Falta aplicar la migración de datos del centro'
            : upErr.message,
        );
        return;
      }
      const r = await saveSalonLogoPath(path);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      const url = publicLogoUrl(path);
      setLogoPath(path);
      setLogoUrl(url ? `${url}?t=${Date.now()}` : null);
      toast('Logotipo actualizado');
      router.refresh();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeLogo = () => {
    setError(null);
    startTransition(async () => {
      if (logoPath) {
        const sb = createClient();
        await sb.storage.from('salon-branding').remove([logoPath]);
      }
      const r = await saveSalonLogoPath(null);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setLogoPath(null);
      setLogoUrl(null);
      toast('Logotipo quitado');
      router.refresh();
    });
  };

  const busy = pending || uploading;

  return (
    <>
      <AjustesSection title="Identidad">
        <Field
          label="Nombre del centro"
          hint="Cómo se llama el salón en la app y en las facturas (marca comercial)."
        >
          <input
            className={inputCls}
            value={form.name}
            disabled={busy}
            maxLength={80}
            onChange={e => set('name', e.target.value)}
            placeholder="marlén estética"
          />
        </Field>
        <div className="border-b border-surface-line py-4 last:border-0">
          <span className="block text-body-lg font-bold text-ink">Logotipo</span>
          <span className="mt-0.5 block text-body leading-snug text-ink-2">
            Sale en la previsualización de facturas. Cuadrado o redondo, fondo claro.
          </span>
          <div className="mt-3 flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface-bg ring-1 ring-surface-line">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <ImagePlus size={22} className="text-ink-3" aria-hidden />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="rounded-pill bg-ink px-4 py-2.5 text-label font-bold text-white disabled:opacity-45"
              >
                {logoUrl ? 'Cambiar' : 'Subir logo'}
              </button>
              {logoUrl && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={removeLogo}
                  className="inline-flex items-center gap-1.5 rounded-pill border border-surface-line bg-surface-card px-4 py-2.5 text-label font-bold text-ink-2 disabled:opacity-45"
                >
                  <Trash2 size={14} strokeWidth={2.2} aria-hidden />
                  Quitar
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              onChange={e => void onPickLogo(e.target.files?.[0])}
            />
          </div>
        </div>
      </AjustesSection>

      <AjustesSection title="Datos fiscales (facturas)">
        <Field
          label="Titular o razón social"
          hint="Nombre completo o empresa que figura como emisor."
        >
          <input
            className={inputCls}
            value={form.legalName}
            disabled={busy}
            maxLength={120}
            onChange={e => set('legalName', e.target.value)}
            placeholder="Marta García Souto"
          />
        </Field>
        <Field label="NIF / CIF">
          <input
            className={inputCls}
            value={form.taxId}
            disabled={busy}
            maxLength={20}
            onChange={e => set('taxId', e.target.value)}
            placeholder="12345678A"
            autoCapitalize="characters"
          />
        </Field>
        <Field label="Dirección fiscal">
          <input
            className={inputCls}
            value={form.fiscalAddress}
            disabled={busy}
            maxLength={200}
            onChange={e => set('fiscalAddress', e.target.value)}
            placeholder="Rúa Real 24, 15003 A Coruña"
          />
        </Field>
        <Field label="Teléfono" hint="Opcional. Puede salir en la factura.">
          <input
            className={inputCls}
            value={form.phone}
            disabled={busy}
            maxLength={30}
            inputMode="tel"
            onChange={e => set('phone', e.target.value)}
            placeholder="981 00 00 00"
          />
        </Field>
      </AjustesSection>

      {error && (
        <p className="mt-4 text-label font-semibold text-danger-fg">{error}</p>
      )}

      <div className="mt-6 pb-2">
        <button
          type="button"
          disabled={busy || !form.name.trim()}
          onClick={save}
          className="h-12 w-full rounded-pill bg-grad text-body font-bold text-white disabled:opacity-45"
        >
          {pending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </>
  );
}
