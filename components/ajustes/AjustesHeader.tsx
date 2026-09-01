import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AjustesHeader({
  title, subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-4">
      <Link
        href="/ajustes"
        className="mb-2 inline-flex min-h-[44px] items-center gap-1.5 text-label font-bold text-ink-2 hover:text-v-d"
      >
        <ArrowLeft size={15} strokeWidth={2.4} aria-hidden />
        Ajustes
      </Link>
      <h1 className="text-h1 font-extrabold tracking-[-.025em]">{title}</h1>
      {subtitle && <p className="mt-px text-body font-medium text-ink-2">{subtitle}</p>}
    </header>
  );
}