'use client';

import BlockSheet from '@/components/agenda/BlockSheet';
import { useShallowParam } from '@/hooks/useShallowQuery';
import type { AgendaBlock, Provider } from '@/lib/types';

export default function BlockSheetHost({
  day, providers, blocks, initialBlock, initialBloqueo,
}: {
  day: string;
  providers: Provider[];
  blocks: AgendaBlock[];
  initialBlock?: boolean;
  initialBloqueo?: string;
}) {
  const block = useShallowParam('block', initialBlock ? '1' : null);
  const bloqueo = useShallowParam('bloqueo', initialBloqueo ?? null);
  const existing = bloqueo ? blocks.find(b => b.id === bloqueo) ?? null : null;

  if (block !== '1' && !bloqueo) return null;

  return (
    <BlockSheet
      day={day}
      providers={providers}
      existing={existing}
    />
  );
}
