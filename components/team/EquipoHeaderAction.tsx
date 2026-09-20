'use client';

import { Plus } from 'lucide-react';
import { HeaderIconButton } from '@/components/ui/ScreenHeader';
import { shallowSet } from '@/hooks/useShallowQuery';

export default function EquipoHeaderAction() {
  return (
    <HeaderIconButton label="Nueva persona" onClick={() => shallowSet({ miembro: '1' })}>
      <Plus size={22} strokeWidth={2.2} />
    </HeaderIconButton>
  );
}
