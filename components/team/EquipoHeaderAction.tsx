'use client';

import { Plus } from 'lucide-react';
import IconButton from '@/components/ui/IconButton';
import { shallowSet } from '@/hooks/useShallowQuery';

export default function EquipoHeaderAction() {
  return (
    <IconButton
      label="Nueva persona"
      tone="outline"
      className="h-12 w-12 rounded-pill"
      onClick={() => shallowSet({ miembro: '1' })}
    >
      <Plus size={22} strokeWidth={2.2} />
    </IconButton>
  );
}
