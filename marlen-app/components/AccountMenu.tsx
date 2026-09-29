'use client';

import { User } from 'lucide-react';
import { shallowSet, useShallowParam } from '@/hooks/useShallowQuery';
import type { WorkspaceKind } from '@/lib/personal-tasks';

export default function AccountMenu({
  workspace,
  hasPersonal,
  variant = 'tab',
}: {
  workspace: WorkspaceKind;
  hasPersonal: boolean;
  /** tab = BottomNav; rail = SideNav */
  variant?: 'tab' | 'rail';
}) {
  const perfil = useShallowParam('perfil');
  const open = perfil === '1';
  const color = workspace === 'personal'
    ? 'text-v-2'
    : hasPersonal
      ? 'text-v'
      : open
        ? 'text-ink'
        : 'text-ink-3';

  if (variant === 'rail') {
    return (
      <div data-no-pull>
        <button
          type="button"
          aria-label="Perfil"
          aria-expanded={open}
          onClick={() => shallowSet({ perfil: open ? null : '1' })}
          className={`flex w-full items-center gap-3 rounded-row px-3 py-2.5 ${color} ${
            open ? 'bg-surface-soft font-bold' : 'font-medium hover:bg-surface-soft/70'
          }`}
        >
          <User size={22} strokeWidth={open ? 2.2 : 1.8} />
          <span className="text-[15px]">Perfil</span>
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
        className={`flex min-h-[44px] w-full flex-col items-center justify-center gap-px ${color}`}
      >
        <span className="grid h-7 w-7 place-items-center">
          <User size={28} strokeWidth={open ? 2.2 : 1.8} />
        </span>
        <span className={`text-[12px] ${open ? 'font-bold' : 'font-medium'}`}>Perfil</span>
      </button>
    </div>
  );
}
