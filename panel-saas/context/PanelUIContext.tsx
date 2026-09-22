'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import MiCuentaDrawer, { type DrawerKind } from '@/components/shell/MiCuentaDrawer';
import PanelModal from '@/components/shell/PanelModal';
import type { ModalData, ModalKind } from '@/lib/panel-modals';
import type { Company } from '@/lib/types';

type Impersonation = { company: Company } | null;

type PanelUIContextValue = {
  toast: (message: string) => void;
  openDrawer: (kind: DrawerKind) => void;
  openModal: (kind: ModalKind, data?: ModalData) => void;
  closeModal: () => void;
  impersonation: Impersonation;
  startImpersonation: (company: Company) => void;
  stopImpersonation: () => void;
};

const PanelUIContext = createContext<PanelUIContextValue | null>(null);

export function usePanelUI() {
  const ctx = useContext(PanelUIContext);
  if (!ctx) throw new Error('usePanelUI must be used within PanelUIProvider');
  return ctx;
}

export function PanelUIProvider({ children }: { children: React.ReactNode }) {
  const [drawer, setDrawer] = useState<DrawerKind | null>(null);
  const [reopenUserOnBack, setReopenUserOnBack] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<{ kind: ModalKind; data: ModalData } | null>(null);
  const [impersonation, setImpersonation] = useState<Impersonation>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const openDrawerFromMenu = useCallback((kind: DrawerKind) => {
    setReopenUserOnBack(true);
    setDrawer(kind);
  }, []);

  const closeDrawer = useCallback(() => setDrawer(null), []);

  const openModal = useCallback((kind: ModalKind, data: ModalData = {}) => {
    setModal({ kind, data });
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  const startImpersonation = useCallback((company: Company) => {
    setImpersonation({ company });
    showToast(`Modo soporte · ${company.name}`);
  }, [showToast]);

  const stopImpersonation = useCallback(() => setImpersonation(null), []);

  const value = useMemo(
    () => ({
      toast: showToast,
      openDrawer: openDrawerFromMenu,
      openModal,
      closeModal,
      impersonation,
      startImpersonation,
      stopImpersonation,
    }),
    [showToast, openDrawerFromMenu, openModal, closeModal, impersonation, startImpersonation, stopImpersonation],
  );

  return (
    <PanelUIContext.Provider value={value}>
      {children}
      {drawer && (
        <MiCuentaDrawer
          kind={drawer}
          onClose={closeDrawer}
          onBack={() => {
            closeDrawer();
            if (reopenUserOnBack) {
              document.dispatchEvent(new CustomEvent('panel:open-user-menu'));
            }
          }}
          onToast={showToast}
        />
      )}
      {modal && (
        <PanelModal kind={modal.kind} data={modal.data} onClose={closeModal} onToast={showToast} />
      )}
      {toast && (
        <div className="pointer-events-none fixed bottom-[92px] left-1/2 z-50 max-w-[90vw] -translate-x-1/2 truncate rounded-[16px] bg-ink px-[18px] py-3.5 text-[14px] font-semibold text-white shadow-[0_12px_30px_rgba(15,14,26,.3)]">
          {toast}
        </div>
      )}
    </PanelUIContext.Provider>
  );
}
