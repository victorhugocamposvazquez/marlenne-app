'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, Eye } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import PanelUserZone from '@/components/shell/PanelUserZone';
import SoporteView from '@/components/soporte/SoporteView';
import { MOBILE_TABS, NAV } from '@/components/shell/nav';
import { usePanelUI } from '@/context/PanelUIContext';
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
  const router = useRouter();
  const active = activeNav(pathname);
  const { impersonation, stopImpersonation } = usePanelUI();
  const inSupport = !!impersonation;

  const mobileTitle = inSupport ? 'Modo soporte' : title;
  const mobileCrumb = inSupport ? 'Empresas' : crumb?.label;
  const mobileCrumbHref = inSupport ? '/empresas' : crumb?.href;

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
        {inSupport && (
          <div className="sticky top-0 z-[5] flex min-h-12 flex-wrap items-center justify-center gap-3.5 bg-grad px-4 py-2 text-center text-[13px] font-semibold text-white">
            <Eye size={16} className="shrink-0" />
            <span>
              Modo soporte · estás dentro de la app de <strong>{impersonation.company.name}</strong> con sus datos reales. Se registra todo lo que hagas.
            </span>
            <button
              type="button"
              onClick={() => {
                const id = impersonation.company.id;
                stopImpersonation();
                router.push(`/empresas/${id}`);
              }}
              className="h-[30px] shrink-0 rounded-pill bg-white px-3.5 text-[12px] font-bold text-brand-pink"
            >
              Volver al panel
            </button>
          </div>
        )}

        <header className={`sticky z-10 hidden h-16 items-center justify-end border-b border-line bg-white px-8 lg:flex ${inSupport ? 'top-12' : 'top-0'}`}>
          <PanelUserZone />
        </header>

        <header className={`sticky z-10 flex min-h-[60px] items-center gap-2.5 border-b border-line bg-white px-4 lg:hidden ${inSupport ? 'top-12' : 'top-0'}`}>
          {(crumb || inSupport) && (
            <button
              type="button"
              onClick={() => router.push(mobileCrumbHref ?? '/empresas')}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-[#F2F2F7]"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            {mobileCrumb && (
              mobileCrumbHref ? (
                <Link href={mobileCrumbHref} className="text-[11px] font-semibold text-ink-3 hover:text-brand-pink">{mobileCrumb}</Link>
              ) : (
                <p className="text-[11px] font-semibold text-ink-3">{mobileCrumb}</p>
              )
            )}
            <h1 className="truncate text-[17px] font-bold tracking-tight">{mobileTitle}</h1>
          </div>
          <PanelUserZone compact />
        </header>

        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 p-4 pb-24 lg:p-8 lg:pb-8">
          {!inSupport && crumb && (
            <nav className="hidden items-center gap-2 text-[13px] font-semibold text-ink-3 lg:flex">
              <Link href={crumb.href} className="text-ink-2 hover:text-brand-pink">{crumb.label}</Link>
              <span className="text-ink-4">›</span>
              <span className="text-ink">{title}</span>
            </nav>
          )}
          {!inSupport && (
            <div className="hidden flex-col gap-1 lg:flex">
              <h1 className="text-[26px] font-bold tracking-[-0.03em]">{title}</h1>
              {subtitle && <p className="text-[14px] text-ink-2">{subtitle}</p>}
            </div>
          )}
          {inSupport ? <SoporteView company={impersonation.company} /> : children}
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
