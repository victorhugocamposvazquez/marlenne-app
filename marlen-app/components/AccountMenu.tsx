'use client';

import { User } from 'lucide-react';
import { shallowSet, useShallowParam } from '@/hooks/useShallowQuery';

export default function AccountMenu({
  variant = 'tab',
  expanded = false,
}: {
  variant?: 'tab' | 'rail';
  /** SideNav expandido: muestra etiqueta junto al avatar. */
  expanded?: boolean;
}) {
  const perfil = useShallowParam('perfil');
  const open = perfil === '1';

  if (variant === 'rail') {
    return (
      <div data-no-pull className={expanded ? 'w-full' : undefined}>
        <button
          type="button"
          aria-label="Perfil"
          aria-expanded={open}
          title="Perfil"
          onClick={() => shallowSet({ perfil: open ? null : '1' })}
          className={`flex items-center rounded-[13px] transition-colors ${
            expanded ? 'h-11 w-full gap-3 px-2 hover:bg-surface-soft' : 'h-11 w-11 justify-center'
          } ${open && expanded ? 'bg-surface-soft' : ''}`}
        >
          <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-ink text-white">
            <User size={18} strokeWidth={2.1} />
          </span>
          {expanded && (
            <span className="truncate text-[13.5px] font-bold text-ink">Perfil</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[44px] flex-col items-center justify-center" data-no-pull>
      <button
        type="button"
        aria-label="Perfil"
        aria-expanded={open}
        onClick={() => shallowSet({ perfil: open ? null : '1' })}
        className={`flex min-h-[44px] w-full flex-col items-center justify-center gap-px ${
          open ? 'text-ink' : 'text-ink-3'
        }`}
      >
        <span className="grid h-7 w-7 place-items-center">
          <User size={28} strokeWidth={open ? 2.2 : 1.8} />
        </span>
        <span className={`text-[12px] ${open ? 'font-bold' : 'font-medium'}`}>Perfil</span>
      </button>
    </div>
  );
}
