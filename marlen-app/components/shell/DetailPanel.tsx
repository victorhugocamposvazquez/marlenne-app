'use client';

import { useShallowParam } from '@/hooks/useShallowQuery';
import { APP_DETAIL_SLOT_ID } from '@/components/shell/detail-slot';

/** Columna derecha: visible si hay sheet abierto (mismos query params que en phone). */
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
  );

  return (
    <aside
      id={APP_DETAIL_SLOT_ID}
      aria-hidden={!open}
      className={`relative flex h-full shrink-0 flex-col overflow-hidden border-l border-surface-line bg-white transition-[width] duration-200 ${
        open ? 'w-[min(420px,38vw)]' : 'w-0 border-l-0'
      }`}
    />
  );
}
