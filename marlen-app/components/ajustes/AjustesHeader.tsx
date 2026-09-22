import type { ReactNode } from 'react';
import SubpageHeader from '@/components/ui/SubpageHeader';

export default function AjustesHeader({
  title, extra, children,
}: {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SubpageHeader href="/ajustes" back="Volver a Ajustes" title={title} extra={extra}>
      {children}
    </SubpageHeader>
  );
}
