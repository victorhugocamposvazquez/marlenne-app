'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, LogOut } from 'lucide-react';
import { usePanelUI } from '@/context/PanelUIContext';
import type { DrawerKind } from '@/components/shell/MiCuentaDrawer';

type Status = 'Disponible' | 'Ocupada' | 'Ausente';

const STATUS_COLOR: Record<Status, string> = {
  Disponible: '#22C55E',
  Ocupada: '#F59E0B',
  Ausente: '#9A97A8',
};

const USER_ITEMS: { label: string; meta: string; kind?: DrawerKind; href?: string; toast?: string }[] = [
  { label: 'Mi perfil', meta: 'nombre, foto, idioma', kind: 'profile' },
  { label: 'Seguridad', meta: '2FA activo', kind: 'security' },
  { label: 'Notificaciones', meta: 'correo + móvil', kind: 'notifPrefs' },
  { label: 'Mi actividad', meta: 'accesos y acciones', href: '/equipo' },
  { label: 'Sesiones activas', meta: '2 dispositivos', kind: 'sessions' },
  { label: 'Ayuda y atajos', meta: '?', toast: 'Atajos: ⌘K buscar · G+E empresas · G+P pagos' },
];

const NOTIFS = [
  { title: 'Proveedor de SMS degradado desde las 8:50', when: 'hace 1 h 40', color: '#F59E0B', href: '/servicios' },
  { title: 'Iria entró en modo soporte en Centro Aura', when: 'hace 20 min', color: '#0879ff', href: '/equipo' },
  { title: '46 cobros fallidos · Stripe reintenta el día 3', when: 'hoy 6:00', color: '#E11D48', href: '/pagos' },
  { title: 'Nueva alta por referido: Clínica Dermis (código AURA-7K2)', when: 'ayer', color: '#d000a8', href: '/empresas' },
  { title: 'Copia de seguridad completada · 2,1 GB', when: 'hoy 4:00', color: '#22C55E', href: '/servicios' },
];

function UserIcon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F0E1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d={d} />
    </svg>
  );
}

const ICONS: Record<string, string> = {
  profile: 'M20 21a8 8 0 1 0-16 0 M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  security: 'M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5z M9 12l2 2 4-4',
  notifPrefs: 'M6 9a6 6 0 0 1 12 0v4l2 3H4l2-3z M10 20a2 2 0 0 0 4 0',
  equipo: 'M12 8v4l3 3 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  sessions: 'M4 5h16v11H4z M8 20h8 M12 16v4',
  help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5 M12 17h.01',
};

export default function PanelUserZone({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const { openDrawer, toast } = usePanelUI();
  const [userOpen, setUserOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [read, setRead] = useState(false);
  const [status, setStatus] = useState<Status>('Disponible');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setUserOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    const openMenu = () => setUserOpen(true);
    document.addEventListener('panel:open-user-menu', openMenu);
    return () => document.removeEventListener('panel:open-user-menu', openMenu);
  }, []);

  const closeMenus = () => { setUserOpen(false); setNotifOpen(false); };

  const cycleStatus = () => {
    setStatus(s => (s === 'Disponible' ? 'Ocupada' : s === 'Ocupada' ? 'Ausente' : 'Disponible'));
  };

  const menuPos = compact
    ? 'right-0 top-[calc(100%+8px)] w-[min(calc(100vw-24px),300px)]'
    : 'right-0 top-[calc(100%+8px)] w-[300px]';

  return (
    <div ref={rootRef} className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={() => { setNotifOpen(o => !o); setUserOpen(false); }}
        className="relative flex h-10 w-10 items-center justify-center rounded-pill border-[1.5px] border-line bg-white"
      >
        <Bell size={18} />
        {!read && <span className="absolute right-2 top-1.5 h-2 w-2 rounded-pill border-2 border-white bg-brand-pink" />}
      </button>

      {notifOpen && (
        <>
          <button type="button" aria-label="Cerrar" onClick={closeMenus} className="fixed inset-0 z-[7]" />
          <div className={`absolute z-[8] overflow-hidden rounded-[20px] border border-line bg-white shadow-menu ${compact ? 'right-0 top-[calc(100%+8px)] w-[min(calc(100vw-24px),360px)]' : 'right-0 top-[calc(100%+8px)] w-[360px]'}`}>
            <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
              <span className="text-[15px] font-bold">Notificaciones</span>
              <button type="button" onClick={() => setRead(true)} className="text-[12px] font-semibold text-brand-pink">
                Marcar leídas
              </button>
            </div>
            {NOTIFS.map(n => (
              <button
                key={n.title}
                type="button"
                onClick={() => { router.push(n.href); closeMenus(); }}
                className="flex w-full gap-3 border-b border-line px-4 py-3 text-left"
                style={{ background: read ? 'transparent' : '#FAF8FF' }}
              >
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-pill" style={{ background: n.color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold leading-snug">{n.title}</p>
                  <p className="text-[12px] text-ink-2">{n.when}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => { setUserOpen(o => !o); setNotifOpen(false); }}
        className={`flex items-center gap-2 rounded-pill border-[1.5px] border-line bg-white ${compact ? 'h-9 py-0 pl-0.5 pr-2' : 'h-10 py-1 pl-1 pr-2.5'}`}
      >
        <span className={`relative flex items-center justify-center rounded-pill bg-ink font-bold text-white ${compact ? 'h-8 w-8 text-[12px]' : 'h-8 w-8 text-[11px]'}`}>
          HC
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-pill border-2 border-white" style={{ background: STATUS_COLOR[status] }} />
        </span>
        {!compact && <ChevronDown size={14} className="text-ink-2" />}
      </button>

      {userOpen && (
        <>
          <button type="button" aria-label="Cerrar" onClick={closeMenus} className="fixed inset-0 z-[7]" />
          <div className={`absolute z-[8] overflow-hidden rounded-[20px] border border-line bg-white shadow-menu ${menuPos}`}>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="relative flex h-11 w-11 items-center justify-center rounded-pill bg-ink text-[13px] font-bold text-white">
                HC
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-pill border-2 border-white" style={{ background: STATUS_COLOR[status] }} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold">Hugo Campos</p>
                <p className="truncate text-[13px] text-ink-2">hugo@marlen.app</p>
                <p className="mt-0.5 text-[12px] font-semibold text-brand-pink">Superadmin</p>
              </div>
            </div>
            <div className="px-1.5 pb-1.5">
              {USER_ITEMS.map((item, i) => {
                const iconKey = item.kind ?? (item.href ? 'equipo' : 'help');
                const inner = (
                  <>
                    <UserIcon d={ICONS[item.kind ?? iconKey] ?? ICONS.help} />
                    <span className="flex-1 text-[14px] font-semibold">{item.label}</span>
                    <span className="text-[12px] text-ink-3">{item.meta}</span>
                  </>
                );
                if (item.href) {
                  return (
                    <Link key={item.label} href={item.href} onClick={closeMenus} className="flex h-11 items-center gap-3 rounded-xl px-2.5 hover:bg-page">
                      {inner}
                    </Link>
                  );
                }
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      closeMenus();
                      if (item.kind) openDrawer(item.kind);
                      else if (item.toast) toast(item.toast);
                    }}
                    className="flex h-11 w-full items-center gap-3 rounded-xl px-2.5 text-left hover:bg-page"
                  >
                    {inner}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-line px-1.5 py-1.5">
              <button type="button" onClick={cycleStatus} className="flex h-11 w-full items-center gap-3 rounded-xl px-2.5 text-left hover:bg-page">
                <span className="flex w-[18px] justify-center">
                  <span className="h-2.5 w-2.5 rounded-pill" style={{ background: STATUS_COLOR[status] }} />
                </span>
                <span className="flex-1 text-[14px] font-semibold">{status}</span>
                <span className="text-[12px] text-ink-3">cambiar</span>
              </button>
              <button type="button" onClick={() => toast('Sesión cerrada (mock)')} className="flex h-11 w-full items-center gap-3 rounded-xl px-2.5 text-left text-[#B3123B] hover:bg-page">
                <LogOut size={18} />
                <span className="flex-1 text-[14px] font-semibold">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
