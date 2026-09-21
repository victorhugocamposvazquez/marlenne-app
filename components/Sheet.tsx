'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import IconButton from '@/components/ui/IconButton';
import SheetShell, { SheetGrab, SheetHandle, useSheetShellClose } from '@/components/SheetShell';
import { shallowSet } from '@/hooks/useShallowQuery';

/** Los sheets viven en la URL, así el botón atrás del móvil también los cierra. */
const SHEET_PARAMS = ['new', 'appt', 'client', 'wait', 'alta', 'miembro', 'close', 'editar', 'block', 'bloqueo', 'nombre', 'hora', 'servicio', 'con'];
const SHALLOW_SHEET = new Set(['appt', 'close', 'new', 'wait', 'block', 'bloqueo', 'client', 'nombre', 'hora', 'servicio', 'con', 'alta', 'miembro', 'editar']);

/** Cierra el sheet quitando sus parámetros y conservando el día y la vista. */
export function useCloseSheet() {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(() => {
    const live = new URLSearchParams(window.location.search);
    const open = SHEET_PARAMS.filter(p => live.has(p));
    for (const p of SHEET_PARAMS) live.delete(p);
    const qs = live.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    if (open.length > 0 && open.every(p => SHALLOW_SHEET.has(p))) {
      shallowSet(Object.fromEntries(SHEET_PARAMS.map(p => [p, null])));
      return;
    }
    router.replace(href, { scroll: false });
  }, [pathname, router]);
}

function SheetBody({
  title, subtitle, children, footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode | ((requestClose: ReturnType<typeof useSheetShellClose>) => React.ReactNode);
}) {
  const requestClose = useSheetShellClose();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SheetGrab className="shrink-0 px-5 pb-3 pt-1">
        <SheetHandle className="mb-3" />
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-title font-bold leading-tight tracking-[-.02em]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-label font-medium text-ink-2">{subtitle}</p>}
          </div>
          <IconButton label="Cerrar" onClick={() => requestClose()}>
            <X size={18} strokeWidth={2.2} />
          </IconButton>
        </div>
      </SheetGrab>

        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 ${footer ? 'pb-2' : 'pb-[max(20px,env(safe-area-inset-bottom))]'}`}
        >
          {children}
        </div>

      {footer && (
        <div className="shrink-0 px-6 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
          {typeof footer === 'function' ? footer(requestClose) : footer}
        </div>
      )}
    </div>
  );
}

export default function Sheet({
  title, subtitle, children, footer, initialHeight = 'mid', floorDetent,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode | ((requestClose: ReturnType<typeof useSheetShellClose>) => React.ReactNode);
  initialHeight?: 'peek' | 'mid' | 'tall';
  floorDetent?: 'peek' | 'mid' | 'tall';
}) {
  const close = useCloseSheet();

  return (
    <LocalSheet
      open
      onClose={close}
      title={title}
      subtitle={subtitle}
      footer={footer}
      initialHeight={initialHeight}
      floorDetent={floorDetent}
    >
      {children}
    </LocalSheet>
  );
}

/** Sheet controlado por estado (ajustes, catálogo) sin parámetros en la URL. */
export function LocalSheet({
  open, onClose, title, subtitle, children, footer,
  initialHeight = 'mid', floorDetent,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode | ((requestClose: ReturnType<typeof useSheetShellClose>) => React.ReactNode);
  initialHeight?: 'peek' | 'mid' | 'tall';
  floorDetent?: 'peek' | 'mid' | 'tall';
}) {
  if (!open) return null;

  return (
    <SheetShell
      onClose={onClose}
      initialHeight={initialHeight}
      floorDetent={floorDetent}
      grabHeader
      className="flex max-h-[92dvh] flex-col"
    >
      <SheetBody title={title} subtitle={subtitle} footer={footer}>
        {children}
      </SheetBody>
    </SheetShell>
  );
}

/** Piezas compartidas por los dos sheets, para que no se separen los estilos. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5">
      <div className="mb-1.5 text-caption font-bold uppercase tracking-[.03em] text-ink-2">{label}</div>
      {children}
    </div>
  );
}

export const inputCls =
  'w-full rounded-field bg-surface-soft px-4 py-3.5 text-[16px] font-medium leading-snug text-ink outline-none placeholder:text-ink-3 focus-visible:ring-2 focus-visible:ring-v/30';

export { default as Chip } from '@/components/ui/Chip';
