'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const DRAFT_KEY = 'marlen_booking_draft';

export default function BookingGoogleButton({
  slug,
  embed,
  linkKey,
  onProfile,
}: {
  slug: string;
  embed?: boolean;
  linkKey?: string | null;
  onProfile: (p: { name?: string; email?: string }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sb = createClient();
    void sb.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) {
        setReady(true);
        return;
      }
      const meta = u.user_metadata ?? {};
      onProfile({
        name: (meta.full_name || meta.name || '') as string,
        email: u.email ?? (meta.email as string | undefined),
      });
      setReady(true);
    });
    // Solo al montar: rellenar si ya hay sesión Google.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startGoogle() {
    setBusy(true);
    try {
      const path = linkKey
        ? `${embed ? '/embed' : '/r'}/${encodeURIComponent(slug)}/l/${encodeURIComponent(linkKey)}`
        : `${embed ? '/embed' : '/r'}/${encodeURIComponent(slug)}`;
      try {
        sessionStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ slug, linkKey, path, t: Date.now() }),
        );
      } catch {
        /* private mode */
      }
      const sb = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(path)}`;
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, queryParams: { prompt: 'select_account' } },
      });
      if (error) throw error;
    } catch {
      setBusy(false);
    }
  }

  if (!ready) return null;

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void startGoogle()}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[var(--bk-line)] bg-white text-[14px] font-semibold text-[var(--bk-ink)] transition hover:bg-[var(--bk-soft)] disabled:opacity-60"
    >
      <GoogleMark />
      {busy ? 'Abriendo Google…' : 'Continuar con Google'}
    </button>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.3 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l.1.1 6.2 5.2C39.2 37.3 44 32 44 24c0-1.3-.1-2.5-.4-3.5z" />
    </svg>
  );
}
