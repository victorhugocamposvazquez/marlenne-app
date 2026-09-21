'use client';

import { Plus } from 'lucide-react';
import { OutlinePillButton } from '@/components/catalog/catalog-ui';
import { shallowSet } from '@/hooks/useShallowQuery';

export default function EquipoHeaderAction() {
  return (
    <OutlinePillButton onClick={() => shallowSet({ miembro: '1' })}>
      <Plus size={15} strokeWidth={2.6} aria-hidden />
      Persona
    </OutlinePillButton>
  );
}
