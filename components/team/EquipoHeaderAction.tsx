'use client';

import { Plus } from 'lucide-react';
import IconButton from '@/components/ui/IconButton';
import { shallowSet } from '@/hooks/useShallowQuery';

export default function EquipoHeaderAction() {
  return (
    <IconButton
      label="Nueva persona"
      tone="ink"
      onClick={() => shallowSet({ miembro: '1' })}
    >
      <Plus size={20} strokeWidth={2.4} />
    </IconButton>
  );
}
