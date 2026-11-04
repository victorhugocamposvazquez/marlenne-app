'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Download, Trash2 } from 'lucide-react';
import { deleteMarketingCreative } from '@/app/actions/marketing';
import { useToast } from '@/components/Toast';
import { KIND_META, FORMAT_SIZES, styleById } from '@/lib/marketing/styles';
import type { MarketingCreativeRow } from '@/lib/marketing/types';

export default function CreativeLibrary({
  items,
}: {
  items: MarketingCreativeRow[];
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();

  if (!items.length) {
    return (
      <p className="rounded-2xl border border-dashed border-surface-line px-4 py-8 text-center text-body text-ink-2">
        Aún no hay creatividades. Genera la primera con «Nueva».
      </p>
    );
  }

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast('Enlace copiado');
    } catch {
      toast('No se pudo copiar');
    }
  };

  return (
    <ul className="grid gap-3 min-[640px]:grid-cols-2">
      {items.map(item => {
        const kind = KIND_META[item.kind]?.label ?? item.kind;
        const style = styleById(item.style_id);
        const format = FORMAT_SIZES[item.format]?.short ?? item.format;
        const cta = item.payload?.ctaUrl ?? '';
        return (
          <li
            key={item.id}
            className="overflow-hidden rounded-2xl border border-surface-line bg-surface-card"
          >
            {item.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image_url}
                alt={item.payload?.headline ?? kind}
                className="aspect-[4/5] w-full object-cover object-top bg-track"
              />
            ) : (
              <div className="grid aspect-[4/5] place-items-center bg-track text-body text-ink-3">
                Sin imagen
              </div>
            )}
            <div className="space-y-2 p-3">
              <div>
                <div className="truncate text-body font-bold text-ink">
                  {item.payload?.headline || kind}
                </div>
                <div className="text-caption text-ink-2">
                  {kind} · {style.name} · {format}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {item.image_url && (
                  <a
                    href={item.image_url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-track px-3 text-caption font-semibold text-ink no-underline"
                  >
                    <Download size={14} strokeWidth={2.2} aria-hidden />
                    PNG
                  </a>
                )}
                {cta && (
                  <button
                    type="button"
                    onClick={() => void copyUrl(cta)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-track px-3 text-caption font-semibold text-ink"
                  >
                    <Copy size={14} strokeWidth={2.2} aria-hidden />
                    Enlace
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    start(async () => {
                      const r = await deleteMarketingCreative(item.id);
                      if (!r.ok) {
                        toast(r.error);
                        return;
                      }
                      toast('Eliminada');
                      router.refresh();
                    });
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-pill px-3 text-caption font-semibold text-danger-fg"
                >
                  <Trash2 size={14} strokeWidth={2.2} aria-hidden />
                  Borrar
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
