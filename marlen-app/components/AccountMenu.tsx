'use client';

import { User } from 'lucide-react';
import { shallowSet, useShallowParam } from '@/hooks/useShallowQuery';

export default function AccountMenu({
  variant = 'tab',
}: {
  variant?: 'tab' | 'rail';
}) {
  const perfil = useShallowParam('perfil');
  const open = perfil === '1';

  if (variant === 'rail') {
    return (
      <div data-no-pull>
        <button
          type="button"
          aria-label="Perfil"
          aria-expanded={open}
          title="Perfil"
          onClick={() => shallowSet({ perfil: open ? null : '1' })}
          className={`grid h-11 w-11 place-items-center rounded-full transition-colors ${
            open ? 'bg-ink text-white' : 'bg-ink text-white'
          }`}
        >
          <User size={18} strokeWidth={2.1} />
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
