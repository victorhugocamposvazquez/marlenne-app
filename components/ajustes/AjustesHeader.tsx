import type { ReactNode } from 'react';
import SubpageHeader from '@/components/ui/SubpageHeader';

export default function AjustesHeader({
  title, children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <SubpageHeader href="/ajustes" back="Volver a Ajustes" title={title}>
      {children}
    </SubpageHeader>
  );
}
