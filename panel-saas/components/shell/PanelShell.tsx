'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ChevronDown } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { MOBILE_TABS, NAV } from '@/components/shell/nav';
import type { NavId } from '@/lib/types';

function activeNav(pathname: string): NavId {
  if (pathname.startsWith('/empresas')) return 'empresas';
  if (pathname.startsWith('/planes')) return 'planes';
  if (pathname.startsWith('/sms')) return 'sms';
  if (pathname.startsWith('/pagos')) return 'pagos';
  if (pathname.startsWith('/finanzas')) return 'finanzas';
  if (pathname.startsWith('/servicios')) return 'servicios';
  if (pathname.startsWith('/equipo')) return 'equipo';
  if (pathname.startsWith('/ajustes')) return 'ajustes';
  return 'inicio';
}

export default function PanelShell({
  title,
  subtitle,
  crumb,
  children,
}: {
  title: string;
  subtitle?: string;
  crumb?: { label: string; href: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = activeNav(pathname);

  return (
    <div className="flex min-h-[100dvh] bg-page">
      <aside className="sticky top-0 hidden h-[100dvh] w-[232px] shrink-0 flex-col gap-1 border-r border-line bg-white px-3.5 py-5 lg:flex">
        <div className="mb-4 flex items-center gap-2.5 px-2.5">
          <BrandLogo size={32} />
          <div className="flex flex-col">
            <span className="text-[15px] font-bold">marlén</span>
            <span className="text-[11px] text-ink-3">Panel de gestión</span>
          </div>
        </div>
        {NAV.map(n => {
          const on = active === n.id;
          return (
            <Link
              key={n.id}
              href={n.href}
              className={`flex h-[42px] items-center gap-2.5 rounded-xl px-3 text-[14px] font-semibold ${on ? 'bg-ink text-white' : 'text-ink hover:bg-page'}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={n.icon} /></svg>
              <span className="flex-1">{n.label}</span>
              {n.badge && !on && (
                <span className="rounded-pill bg-page px-1.5 py-0.5 text-[11px] font-bold text-ink-2">{n.badge}</span>
              )}
            </Link>
          );
        })}
        <div className="mt-auto border-t border-line px-2.5 pt-3 text-[11px] text-ink-3">
          v0.1 · mock · sin BD
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 hidden h-16 items-center justify-end gap-2 border-b border-line bg-white px-8 lg:flex">
          <button type="button" className="relative flex h-10 w-10 items-center justify-center rounded-pill border-[1.5px] border-line bg-white">
            <Bell size={18} />
            <span className="absolute right-2 top-1.5 h-2 w-2 rounded-pill border-2 border-white bg-brand-pink" />
          </button>
          <button type="button" className="flex h-10 items-center gap-2 rounded-pill border-[1.5px] border-line bg-white py-1 pl-1 pr-2.5">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-pill bg-ink text-[11px] font-bold text-white">
              MG
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-pill border-2 border-white bg-ok" />
            </span>
            <ChevronDown size={14} className="text-ink-2" />
          </button>
        </header>

        <header className="sticky top-0 z-10 flex h-[60px] items-center gap-2.5 border-b border-line bg-white px-4 lg:hidden">
          <div className="min-w-0 flex-1">
            {crumb && <p className="text-[11px] font-semibold text-ink-3">{crumb.label}</p>}
            <h1 className="truncate text-[17px] font-bold tracking-tight">{title}</h1>
          </div>
          <span className="relative flex h-9 w-9 items-center justify-center rounded-pill bg-ink text-[12px] font-bold text-white">
            MG
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-pill border-2 border-white bg-ok" />
          </span>
        </header>

        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 p-4 pb-24 lg:p-8 lg:pb-8">
          {crumb && (
            <nav className="hidden items-center gap-2 text-[13px] font-semibold text-ink-3 lg:flex">
              <Link href={crumb.href} className="text-ink-2 hover:text-brand-pink">{crumb.label}</Link>
              <span className="text-ink-4">›</span>
              <span className="text-ink">{title}</span>
            </nav>
          )}
          <div className="hidden flex-col gap-1 lg:flex">
            <h1 className="text-display">{title}</h1>
            {subtitle && <p className="text-[14px] text-ink-2">{subtitle}</p>}
          </div>
          {children}
        </div>

        <nav className="fixed bottom-0 left-0 right-0 z-10 flex h-[76px] items-start justify-around border-t border-line bg-white pt-2.5 lg:hidden">
          {MOBILE_TABS.map(t => {
            const on = active === t.id;
            return (
              <Link key={t.id} href={t.href} className={`flex flex-col items-center gap-1 px-1.5 ${on ? 'text-brand-pink' : 'text-ink-3'}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon} /></svg>
                <span className="text-[11px] font-bold">{t.label}</span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
