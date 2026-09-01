import type { ReactNode } from 'react';
import SubpageHeader from '@/components/ui/SubpageHeader';

export default function AjustesHeader({
  title, subtitle, children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <SubpageHeader href="/ajustes" back="Ajustes" title={title} subtitle={subtitle}>
      {children}
    </SubpageHeader>
  );
}
