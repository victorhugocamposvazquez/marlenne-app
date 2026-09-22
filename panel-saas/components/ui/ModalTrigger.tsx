'use client';

import { usePanelUI } from '@/context/PanelUIContext';
import type { ModalData, ModalKind } from '@/lib/panel-modals';

export default function ModalTrigger({
  kind,
  data,
  className,
  children,
  disabled,
}: {
  kind: ModalKind;
  data?: ModalData;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { openModal } = usePanelUI();
  return (
    <button type="button" disabled={disabled} className={className} onClick={() => openModal(kind, data)}>
      {children}
    </button>
  );
}
