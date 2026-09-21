'use client';

import { useEffect, useRef, useState } from 'react';
import { EllipsisVertical, Phone } from 'lucide-react';
import IconButton from '@/components/ui/IconButton';

type Props = {
  clientLabel: string;
  phone?: string | null;
  pending?: boolean;
  onPasa: () => void;
  onNoshow: () => void;
  align?: 'left' | 'right';
};

export default function ApptActionsMenu({
  clientLabel,
  phone,
  pending = false,
  onPasa,
  onNoshow,
  align = 'right',
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative">
      <IconButton
        label={`Acciones para ${clientLabel}`}
        tone="card"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen(o => !o)}
      >
        <EllipsisVertical size={18} strokeWidth={2.2} />
      </IconButton>
      {open && (
        <ul
          role="menu"
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-[calc(100%+6px)] z-30 min-w-[10.5rem] overflow-hidden rounded-row border border-surface-line bg-surface-card py-1 shadow-lift`}
        >
          <li role="none">
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => { close(); onPasa(); }}
              className="flex min-h-[44px] w-full items-center px-4 text-left text-body font-semibold text-v-d motion-safe:active:bg-surface-soft disabled:opacity-40"
            >
              Pasa a cabina
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => { close(); onNoshow(); }}
              className="flex min-h-[44px] w-full items-center px-4 text-left text-body font-semibold text-danger-fg motion-safe:active:bg-surface-soft disabled:opacity-40"
            >
              No vino
            </button>
          </li>
          {phone && (
            <li role="none">
              <a
                role="menuitem"
                href={`tel:${phone}`}
                onClick={close}
                className="flex min-h-[44px] w-full items-center gap-2 px-4 text-body font-semibold text-ink motion-safe:active:bg-surface-soft"
              >
                <Phone size={16} strokeWidth={2.2} aria-hidden />
                Llamar
              </a>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
