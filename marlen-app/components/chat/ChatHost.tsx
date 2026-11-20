'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import MarlenChat, { GRAD } from '@/components/chat/MarlenChat';
import { createMarlenChatApi } from '@/lib/chat/api';
import { createVoiceAdapter } from '@/lib/chat/voice-adapter';

const TITLES: Record<string, string> = {
  '/hoy': 'Hoy',
  '/agenda': 'Agenda',
  '/clientas': 'Clientas',
  '/tareas': 'Tareas',
  '/finanzas': 'Finanzas',
  '/ajustes': 'Ajustes',
};

function screenTitle(pathname: string) {
  if (pathname.startsWith('/clientas/')) return 'Ficha';
  if (pathname.startsWith('/ajustes/')) return 'Ajustes';
  for (const [prefix, title] of Object.entries(TITLES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return title;
  }
  return 'Marlén';
}

export default function ChatHost({ role }: { role: string }) {
  const pathname = usePathname() || '/hoy';
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  /** Abre la ruta debajo; el panel se queda encima (chat-marlen.md). */
  const onNavigate = useCallback((href: string) => {
    router.push(href);
  }, [router]);

  const api = useMemo(() => createMarlenChatApi(role, onNavigate), [role, onNavigate]);
  const voice = useMemo(() => createVoiceAdapter(), []);

  const screen = useMemo(() => ({
    route: pathname,
    title: screenTitle(pathname),
    citaId: searchParams.get('cita') ?? searchParams.get('id') ?? undefined,
    clientaId: searchParams.get('client') ?? undefined,
  }), [pathname, searchParams]);

  if (pathname.startsWith('/ajustes/marketing')) return null;

  const fabBottom = pathname.startsWith('/agenda') || pathname.startsWith('/clientas')
    ? 'bottom-[calc(9.25rem+env(safe-area-inset-bottom))] standalone:bottom-[calc(8.75rem+max(6px,calc(env(safe-area-inset-bottom)-12px)))]'
    : 'bottom-[calc(5.75rem+env(safe-area-inset-bottom))] standalone:bottom-[calc(5.25rem+max(6px,calc(env(safe-area-inset-bottom)-12px)))]';

  return (
    <>
      {!open && (
        <div className={`voice-fab-host pointer-events-none absolute inset-x-0 z-30 flex justify-end px-3 ${fabBottom}`}>
          <button
            type="button"
            aria-label="Abrir el chat de Marlén"
            onClick={() => setOpen(true)}
            className="pointer-events-auto grid h-14 w-14 place-items-center rounded-full text-white shadow-[0_10px_28px_rgba(208,0,168,.3)] motion-safe:active:scale-[.96]"
            style={{ background: GRAD }}
          >
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
              <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
            </svg>
          </button>
        </div>
      )}
      <MarlenChat
        open={open}
        onClose={() => setOpen(false)}
        api={api}
        screen={screen}
        voice={voice}
        onNavigate={onNavigate}
      />
    </>
  );
}
