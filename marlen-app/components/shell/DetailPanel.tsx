'use client';

import { useSyncExternalStore } from 'react';
import { useShallowParam } from '@/hooks/useShallowQuery';
import { APP_DETAIL_SLOT_ID } from '@/components/shell/detail-slot';
import { getDetailClaimCount, subscribeDetailClaims } from '@/components/shell/detail-claims';

/** Columna derecha: visible si hay sheet abierto (URL o LocalSheet). */
export default function DetailPanel() {
  const creating = useShallowParam('new');
  const editing = useShallowParam('appt');
  const wait = useShallowParam('wait');
  const block = useShallowParam('block');
  const bloqueo = useShallowParam('bloqueo');
  const alta = useShallowParam('alta');
  const miembro = useShallowParam('miembro');
  const task = useShallowParam('tarea');
  const editar = useShallowParam('editar');
  const claimed = useSyncExternalStore(subscribeDetailClaims, getDetailClaimCount, () => 0);

  const open = Boolean(
    creating === '1'
    || editing
    || wait === '1'
    || block === '1'
    || bloqueo
    || alta === '1'
    || miembro === '1'
    || task
    || editar
    || claimed > 0
  );

  return (
    <aside
      id={APP_DETAIL_SLOT_ID}
      aria-hidden={!open}
      className={`pointer-events-none absolute inset-y-0 right-0 z-30 flex flex-col overflow-hidden border-l border-surface-line bg-white shadow-[-12px_0_32px_rgba(15,14,26,.08)] transition-transform duration-200 ease-out ${
        open
          ? 'pointer-events-auto w-[min(420px,38vw)] translate-x-0'
          : 'w-[min(420px,38vw)] translate-x-full border-l-0 shadow-none'
      }`}
    />
  );
}
