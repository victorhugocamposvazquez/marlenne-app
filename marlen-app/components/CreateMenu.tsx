'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { HeaderIconButton } from '@/components/ui/ScreenHeader';
import type { StaffRole } from '@/lib/types';

type Item = { id: string; label: string; run: () => void };

export default function CreateMenu({ role }: { role: StaffRole }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const admin = role === 'admin';
  const desk = admin || role === 'reception';
  const provider = role === 'provider';

  const items: Item[] = [
    { id: 'cita', label: 'Cita', run: () => router.push('/agenda?new=1') },
    ...(!provider ? [{ id: 'cliente', label: 'Client@', run: () => router.push('/clientas?alta=1') }] : []),
    ...(admin ? [{ id: 'equipo', label: 'Equipo', run: () => router.push('/ajustes/equipo?miembro=1') }] : []),
    ...(admin ? [{ id: 'servicio', label: 'Servicio', run: () => router.push('/ajustes/servicios') }] : []),
    ...(desk ? [{ id: 'bono', label: 'Bono', run: () => router.push('/ajustes/bonos') }] : []),
  ];

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

  const pick = (item: Item) => {
    setOpen(false);
    item.run();
  };

  return (
    <div ref={ref} className="relative">
      <HeaderIconButton
        label="Crear"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <Plus size={22} strokeWidth={2.2} />
      </HeaderIconButton>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-30 min-w-[11rem] overflow-hidden rounded-row border border-surface-line bg-surface-card py-1 shadow-lift"
        >
          {items.map(item => (
            <li key={item.id} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => pick(item)}
                className="flex min-h-[44px] w-full items-center px-4 text-left text-body font-semibold text-ink motion-safe:active:bg-surface-soft"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
